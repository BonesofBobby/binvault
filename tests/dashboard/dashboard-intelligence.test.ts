import {
  InventoryType,
  MediaType,
} from "@prisma/client";
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { prisma } from "@/lib/db/prisma";
import { getDashboardAttention } from "@/lib/services/dashboard/attention";
import { dashboardService } from "@/lib/services/dashboard/dashboard-service";
import { getDashboardInsights } from "@/lib/services/dashboard/insights";
import { getDashboardRecentItems } from "@/lib/services/dashboard/recent-items";
import {
  DASHBOARD_RECENT_ACTIVITY_LIMIT,
  getDashboardRecentActivity,
} from "@/lib/services/dashboard/recent-activity";
import { recordEvent } from "@/lib/services/event-service";
import { getDashboardStorage } from "@/lib/services/dashboard/storage";
import { getDashboardSummary } from "@/lib/services/dashboard/summary";

async function createContainer(
  binNumber: string,
  name: string = binNumber,
) {
  return prisma.container.create({
    data: {
      binNumber,
      name,
    },
  });
}

async function createInventoryItem(input: {
  name: string;
  containerId: number;
  inventoryType?: InventoryType;
  quantity?: number;
  categoryId?: number | null;
  expirationDate?: Date | null;
  warrantyEnd?: Date | null;
  minimumQuantity?: number | null;
  createdAt?: Date;
}) {
  return prisma.inventoryItem.create({
    data: {
      name: input.name,
      containerId: input.containerId,
      inventoryType:
        input.inventoryType ?? InventoryType.STANDARD_ITEM,
      quantity: input.quantity ?? 1,
      categoryId: input.categoryId,
      expirationDate: input.expirationDate,
      warrantyEnd: input.warrantyEnd,
      minimumQuantity: input.minimumQuantity,
      createdAt: input.createdAt,
    },
  });
}

async function createMedia(
  inventoryId: number,
  mediaType: MediaType,
  suffix: string,
) {
  return prisma.media.create({
    data: {
      inventoryId,
      mediaType,
      fileName: `${suffix}.dat`,
      originalName: `${suffix}.dat`,
      mimeType: "application/octet-stream",
      sizeBytes: 1,
      storagePath: `tests/${suffix}.dat`,
    },
  });
}

describe("Dashboard Intelligence", () => {
  it("returns empty-state values across dashboard modules", async () => {
    await expect(getDashboardSummary()).resolves.toEqual({
      locationCount: 0,
      containerCount: 0,
      inventoryItemCount: 0,
      assetCount: 0,
      consumableCount: 0,
      documentCount: 0,
      mediaCount: 0,
      categoryCount: 0,
    });

    await expect(getDashboardAttention()).resolves.toEqual({
      items: [],
      criticalCount: 0,
      warningCount: 0,
      informationCount: 0,
    });
    await expect(getDashboardRecentItems()).resolves.toEqual([]);
    await expect(getDashboardRecentActivity()).resolves.toEqual([]);
    await expect(getDashboardStorage()).resolves.toEqual([]);
    await expect(getDashboardInsights()).resolves.toEqual({
      mostUsedCategory: null,
      largestContainer: null,
      newestItem: null,
      oldestItem: null,
      itemsWithoutPhotosCount: 0,
    });
  });

  it("calculates summary counts", async () => {
    const location = await prisma.location.create({
      data: { name: "Garage" },
    });
    const category = await prisma.category.create({
      data: { name: "Tools" },
    });
    const containerType = await prisma.containerType.create({
      data: { name: "Tote" },
    });
    const container = await prisma.container.create({
      data: {
        binNumber: "BIN-001",
        name: "Main Tote",
        locationId: location.id,
        containerTypeId: containerType.id,
      },
    });

    const standardItem = await createInventoryItem({
      name: "Cable",
      containerId: container.id,
      categoryId: category.id,
    });
    await createInventoryItem({
      name: "Drill",
      containerId: container.id,
      inventoryType: InventoryType.ASSET,
    });
    await createInventoryItem({
      name: "Filter",
      containerId: container.id,
      inventoryType: InventoryType.CONSUMABLE,
    });
    await createInventoryItem({
      name: "Policy",
      containerId: container.id,
      inventoryType: InventoryType.DOCUMENT,
    });
    await createMedia(
      standardItem.id,
      MediaType.PHOTO,
      "summary-photo",
    );

    await expect(getDashboardSummary()).resolves.toEqual({
      locationCount: 1,
      containerCount: 1,
      inventoryItemCount: 4,
      assetCount: 1,
      consumableCount: 1,
      documentCount: 1,
      mediaCount: 1,
      categoryCount: 1,
    });
  });

  it("includes document expiration boundaries and raises expired urgency", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 28, 12));

    const container = await createContainer("DOCS");

    await createInventoryItem({
      name: "Expired Document",
      containerId: container.id,
      inventoryType: InventoryType.DOCUMENT,
      expirationDate: new Date(2026, 6, 27),
    });
    await createInventoryItem({
      name: "Expires Today",
      containerId: container.id,
      inventoryType: InventoryType.DOCUMENT,
      expirationDate: new Date(2026, 6, 28),
    });
    await createInventoryItem({
      name: "Boundary Document",
      containerId: container.id,
      inventoryType: InventoryType.DOCUMENT,
      expirationDate: new Date(2026, 7, 27),
    });
    await createInventoryItem({
      name: "Outside Window",
      containerId: container.id,
      inventoryType: InventoryType.DOCUMENT,
      expirationDate: new Date(2026, 7, 28),
    });

    const attention = await getDashboardAttention();

    expect(
      attention.items.map((item) => ({
        name: item.inventoryItemName,
        severity: item.severity,
        title: item.title,
      })),
    ).toEqual([
      {
        name: "Expired Document",
        severity: "critical",
        title: "Document Expired",
      },
      {
        name: "Expires Today",
        severity: "warning",
        title: "Document Expiring",
      },
      {
        name: "Boundary Document",
        severity: "warning",
        title: "Document Expiring",
      },
    ]);
    expect(attention.criticalCount).toBe(1);
    expect(attention.warningCount).toBe(2);
  });

  it("includes warranty expiration boundaries and raises expired urgency", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 28, 12));

    const container = await createContainer("ASSETS");

    await createInventoryItem({
      name: "Expired Warranty",
      containerId: container.id,
      inventoryType: InventoryType.ASSET,
      warrantyEnd: new Date(2026, 6, 27),
    });
    await createInventoryItem({
      name: "Boundary Warranty",
      containerId: container.id,
      inventoryType: InventoryType.ASSET,
      warrantyEnd: new Date(2026, 7, 27),
    });
    await createInventoryItem({
      name: "Outside Warranty",
      containerId: container.id,
      inventoryType: InventoryType.ASSET,
      warrantyEnd: new Date(2026, 7, 28),
    });

    const attention = await getDashboardAttention();

    expect(
      attention.items.map((item) => ({
        name: item.inventoryItemName,
        severity: item.severity,
        title: item.title,
      })),
    ).toEqual([
      {
        name: "Expired Warranty",
        severity: "warning",
        title: "Warranty Expired",
      },
      {
        name: "Boundary Warranty",
        severity: "information",
        title: "Warranty Expiring",
      },
    ]);
  });

  it("flags consumables at or below their threshold", async () => {
    const container = await createContainer("SUPPLIES");

    await createInventoryItem({
      name: "Below",
      containerId: container.id,
      inventoryType: InventoryType.CONSUMABLE,
      quantity: 1,
      minimumQuantity: 2,
    });
    await createInventoryItem({
      name: "Equal",
      containerId: container.id,
      inventoryType: InventoryType.CONSUMABLE,
      quantity: 2,
      minimumQuantity: 2,
    });
    await createInventoryItem({
      name: "Above",
      containerId: container.id,
      inventoryType: InventoryType.CONSUMABLE,
      quantity: 3,
      minimumQuantity: 2,
    });

    const attention = await getDashboardAttention();

    expect(
      attention.items.map((item) => item.inventoryItemName),
    ).toEqual(["Below", "Equal"]);
    expect(attention.criticalCount).toBe(2);
  });

  it("aggregates categories and uses deterministic category tie-breaking", async () => {
    const container = await createContainer("CATEGORIES");
    const alpha = await prisma.category.create({
      data: { name: "Alpha" },
    });
    const beta = await prisma.category.create({
      data: { name: "Beta" },
    });

    await createInventoryItem({
      name: "Alpha Item",
      containerId: container.id,
      categoryId: alpha.id,
      quantity: 2,
    });
    await createInventoryItem({
      name: "Beta Item",
      containerId: container.id,
      categoryId: beta.id,
      quantity: 2,
    });

    const insights = await getDashboardInsights();

    expect(insights.mostUsedCategory).toMatchObject({
      name: "Alpha",
      inventoryItemCount: 1,
      totalQuantity: 2,
    });
  });

  it("does not choose an empty category", async () => {
    await prisma.category.createMany({
      data: [
        { name: "Alpha" },
        { name: "Beta" },
      ],
    });

    const insights = await getDashboardInsights();

    expect(insights.mostUsedCategory).toBeNull();
  });

  it("aggregates containers and uses deterministic container tie-breaking", async () => {
    const second = await createContainer(
      "BIN-002",
      "Second",
    );
    const first = await createContainer(
      "BIN-001",
      "First",
    );

    await createInventoryItem({
      name: "Second Item",
      containerId: second.id,
      quantity: 3,
    });
    await createInventoryItem({
      name: "First Item",
      containerId: first.id,
      quantity: 3,
    });

    const insights = await getDashboardInsights();

    expect(insights.largestContainer).toMatchObject({
      binNumber: "BIN-001",
      inventoryItemCount: 1,
      totalQuantity: 3,
    });
  });

  it("orders and limits recently added inventory", async () => {
    const container = await createContainer("RECENT");

    await createInventoryItem({
      name: "Oldest",
      containerId: container.id,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await createInventoryItem({
      name: "Newest",
      containerId: container.id,
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
    });
    await createInventoryItem({
      name: "Middle",
      containerId: container.id,
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
    });

    const recent = await getDashboardRecentItems(2);

    expect(recent.map((item) => item.name)).toEqual([
      "Newest",
      "Middle",
    ]);
  });

  it("orders and limits recent activity while retaining deleted-entity events", async () => {
    const timestamp = new Date("2026-04-01T00:00:00.000Z");
    for (let index = 0; index < DASHBOARD_RECENT_ACTIVITY_LIMIT + 2; index += 1) {
      await recordEvent({
        eventType:
          index === DASHBOARD_RECENT_ACTIVITY_LIMIT + 1
            ? "inventory.deleted"
            : "inventory.edited",
        entityType: "inventory",
        entityId: index + 1,
        summary:
          index === DASHBOARD_RECENT_ACTIVITY_LIMIT + 1
            ? "Deleted inventory item Gone."
            : `Edited item ${index}.`,
        createdAt: timestamp,
      });
    }

    const activity = await getDashboardRecentActivity();
    expect(activity).toHaveLength(DASHBOARD_RECENT_ACTIVITY_LIMIT);
    expect(activity.map((event) => event.id)).toEqual(
      [...activity.map((event) => event.id)].sort((a, b) => b - a),
    );
    expect(activity[0].summary).toBe("Deleted inventory item Gone.");

    const deletion = await prisma.event.findFirstOrThrow({
      where: { eventType: "inventory.deleted" },
    });
    await expect(prisma.inventoryItem.findUnique({ where: { id: 1 } })).resolves.toBeNull();
    expect(deletion.summary).toBe("Deleted inventory item Gone.");
  });

  it("counts items without PHOTO media specifically", async () => {
    const container = await createContainer("MEDIA");
    await createInventoryItem({
      name: "No Media",
      containerId: container.id,
    });
    const documentOnly = await createInventoryItem({
      name: "Document Only",
      containerId: container.id,
    });
    const withPhoto = await createInventoryItem({
      name: "With Photo",
      containerId: container.id,
    });

    await createMedia(
      documentOnly.id,
      MediaType.DOCUMENT,
      "document-only",
    );
    await createMedia(
      withPhoto.id,
      MediaType.PHOTO,
      "with-photo",
    );

    const insights = await getDashboardInsights();

    expect(insights.itemsWithoutPhotosCount).toBe(2);
  });

  it("returns an integrated dashboard response from isolated data", async () => {
    const location = await prisma.location.create({
      data: { name: "Workshop" },
    });
    const category = await prisma.category.create({
      data: { name: "Hardware" },
    });
    const container = await prisma.container.create({
      data: {
        binNumber: "WORK-001",
        name: "Hardware Bin",
        locationId: location.id,
      },
    });
    await createInventoryItem({
      name: "Screws",
      containerId: container.id,
      categoryId: category.id,
      inventoryType: InventoryType.CONSUMABLE,
      quantity: 4,
      minimumQuantity: 5,
    });

    const dashboard = await dashboardService.getDashboardData();

    expect(dashboard.summary).toMatchObject({
      locationCount: 1,
      containerCount: 1,
      inventoryItemCount: 1,
      consumableCount: 1,
    });
    expect(dashboard.attention.criticalCount).toBe(1);
    expect(dashboard.recentItems[0]?.name).toBe("Screws");
    expect(dashboard.storage[0]).toMatchObject({
      name: "Workshop",
      containerCount: 1,
      inventoryItemCount: 1,
      totalQuantity: 4,
    });
    expect(dashboard.insights.mostUsedCategory?.name).toBe(
      "Hardware",
    );
    expect(dashboard.generatedAt).toBeInstanceOf(Date);
  });
});
