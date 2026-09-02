import { InventoryType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { updateInventoryItem as updateInventoryAction } from "@/app/inventory/[id]/edit/actions";
import { createInventoryItem as createInventoryAction } from "@/app/storage/[id]/inventory/new/actions";
import { prisma } from "@/lib/db/prisma";
import {
  InventoryContainerNotFoundError,
  InventoryNotFoundError,
  InventoryValidationError,
  inventoryLifecycleService,
  type InventoryMutationInput,
} from "@/lib/services/inventory-lifecycle-service";

async function container() {
  return prisma.container.create({
    data: { binNumber: `BIN-${crypto.randomUUID()}`, name: "Test Container" },
  });
}

async function category(name = `Category-${crypto.randomUUID()}`) {
  return prisma.category.create({ data: { name } });
}

async function assetFixture() {
  const target = await container();
  const item = await prisma.inventoryItem.create({
    data: {
      containerId: target.id,
      name: "Laptop",
      inventoryType: InventoryType.ASSET,
      quantity: 2,
      condition: "Good",
      notes: "Original notes",
      manufacturer: "Acme",
      modelNumber: "Model-1",
      serialNumber: "Serial-1",
      purchaseDate: new Date("2025-01-15T00:00:00.000Z"),
      purchasePrice: 499.99,
      warrantyEnd: new Date("2027-01-15T00:00:00.000Z"),
    },
  });
  return { target, item };
}

function standard(overrides: InventoryMutationInput = {}): InventoryMutationInput {
  return {
    name: "Cable",
    inventoryType: "STANDARD_ITEM",
    quantity: "1",
    categoryId: "",
    condition: "Good",
    notes: "",
    ...overrides,
  };
}

describe("inventory creation reliability", () => {
  it("creates a valid standard item and exactly one event", async () => {
    const target = await container();
    const item = await inventoryLifecycleService.createInventoryItem(
      target.id,
      standard(),
    );
    expect(item).toMatchObject({
      name: "Cable",
      inventoryType: InventoryType.STANDARD_ITEM,
      quantity: 1,
      categoryId: null,
    });
    expect(await prisma.inventoryItem.count()).toBe(1);
    expect(await prisma.event.count({ where: { eventType: "inventory.created" } })).toBe(1);
  });

  it("creates an asset with supported metadata", async () => {
    const target = await container();
    const item = await inventoryLifecycleService.createInventoryItem(target.id, {
      ...standard({ name: "Laptop", inventoryType: "ASSET" }),
      manufacturer: " Acme ",
      modelNumber: " Model-9 ",
      serialNumber: " Serial-9 ",
      purchasePrice: "1299.95",
      purchaseDate: "2026-02-28",
      warrantyEnd: "2028-02-29",
    });
    expect(item).toMatchObject({
      manufacturer: "Acme",
      modelNumber: "Model-9",
      serialNumber: "Serial-9",
      purchasePrice: 1299.95,
      purchaseDate: new Date("2026-02-28T00:00:00.000Z"),
      warrantyEnd: new Date("2028-02-29T00:00:00.000Z"),
    });
  });

  it("creates a document with document metadata", async () => {
    const target = await container();
    const item = await inventoryLifecycleService.createInventoryItem(target.id, {
      ...standard({ name: "Policy", inventoryType: "DOCUMENT" }),
      documentType: " Insurance Policy ",
      expirationDate: "2027-12-31",
    });
    expect(item).toMatchObject({
      documentType: "Insurance Policy",
      expirationDate: new Date("2027-12-31T00:00:00.000Z"),
    });
  });

  it("creates a consumable with supported metadata", async () => {
    const target = await container();
    const item = await inventoryLifecycleService.createInventoryItem(target.id, {
      ...standard({ name: "Filter", inventoryType: "CONSUMABLE", quantity: "3" }),
      partNumber: " FILTER-1 ",
      minimumQuantity: "0",
      replacementIntervalDays: "180",
    });
    expect(item).toMatchObject({
      partNumber: "FILTER-1",
      minimumQuantity: 0,
      replacementIntervalDays: 180,
    });
  });

  it("trims names and rejects blank or overlong names", async () => {
    const target = await container();
    await expect(
      inventoryLifecycleService.createInventoryItem(target.id, standard({ name: "  Cable  " })),
    ).resolves.toMatchObject({ name: "Cable" });
    await expect(
      inventoryLifecycleService.createInventoryItem(target.id, standard({ name: "   " })),
    ).rejects.toMatchObject({ fieldErrors: { name: "An inventory name is required." } });
    await expect(
      inventoryLifecycleService.createInventoryItem(target.id, standard({ name: "x".repeat(201) })),
    ).rejects.toMatchObject({ fieldErrors: { name: "Use 200 characters or fewer." } });
  });

  it.each(["0", "-1", "1.5", "abc", ""])(
    "rejects invalid quantity %p without writing an item or event",
    async (quantity) => {
      const target = await container();
      await expect(
        inventoryLifecycleService.createInventoryItem(target.id, standard({ quantity })),
      ).rejects.toMatchObject({
        fieldErrors: { quantity: "Enter a whole number greater than zero." },
      });
      expect(await prisma.inventoryItem.count()).toBe(0);
      expect(await prisma.event.count()).toBe(0);
    },
  );

  it("accepts a valid optional price and rejects malformed or negative prices", async () => {
    const target = await container();
    await expect(
      inventoryLifecycleService.createInventoryItem(target.id, {
        ...standard({ inventoryType: "ASSET" }),
        purchasePrice: "0",
      }),
    ).resolves.toMatchObject({ purchasePrice: 0 });
    for (const purchasePrice of ["abc", "-0.01", "Infinity"]) {
      await expect(
        inventoryLifecycleService.createInventoryItem(target.id, {
          ...standard({ name: `Bad ${purchasePrice}`, inventoryType: "ASSET" }),
          purchasePrice,
        }),
      ).rejects.toMatchObject({
        fieldErrors: { purchasePrice: "Enter a valid non-negative price." },
      });
    }
  });

  it("accepts real dates and rejects malformed or impossible dates", async () => {
    const target = await container();
    await expect(
      inventoryLifecycleService.createInventoryItem(target.id, {
        ...standard({ inventoryType: "ASSET" }),
        purchaseDate: "2024-02-29",
      }),
    ).resolves.toMatchObject({ purchaseDate: new Date("2024-02-29T00:00:00.000Z") });
    for (const purchaseDate of ["not-a-date", "2025-02-29", "2025-13-01"]) {
      await expect(
        inventoryLifecycleService.createInventoryItem(target.id, {
          ...standard({ name: `Bad ${purchaseDate}`, inventoryType: "ASSET" }),
          purchaseDate,
        }),
      ).rejects.toMatchObject({ fieldErrors: { purchaseDate: "Enter a valid date." } });
    }
  });

  it("rejects a nonexistent category", async () => {
    const target = await container();
    await expect(
      inventoryLifecycleService.createInventoryItem(target.id, standard({ categoryId: "999999" })),
    ).rejects.toMatchObject({
      fieldErrors: { categoryId: "The selected category is no longer available." },
    });
  });

  it("supports zero categories", async () => {
    const target = await container();
    expect(await prisma.category.count()).toBe(0);
    await expect(
      inventoryLifecycleService.createInventoryItem(target.id, standard({ categoryId: "" })),
    ).resolves.toMatchObject({ categoryId: null });
  });

  it("rejects a nonexistent container with no item or event", async () => {
    await expect(
      inventoryLifecycleService.createInventoryItem(999999, standard()),
    ).rejects.toBeInstanceOf(InventoryContainerNotFoundError);
    expect(await prisma.inventoryItem.count()).toBe(0);
    expect(await prisma.event.count()).toBe(0);
  });
});

describe("inventory edit reliability", () => {
  it("updates valid intended fields and records one edit event", async () => {
    const { item } = await assetFixture();
    const updated = await inventoryLifecycleService.updateInventoryItem(item.id, {
      name: "Updated Laptop",
      quantity: "3",
      notes: "Updated notes",
    });
    expect(updated).toMatchObject({
      name: "Updated Laptop",
      quantity: 3,
      notes: "Updated notes",
      purchasePrice: 499.99,
      serialNumber: "Serial-1",
    });
    expect(await prisma.event.count({ where: { eventType: "inventory.edited" } })).toBe(1);
  });

  it("rejects a blank required name without changing the item", async () => {
    const { item } = await assetFixture();
    await expect(
      inventoryLifecycleService.updateInventoryItem(item.id, { name: " " }),
    ).rejects.toBeInstanceOf(InventoryValidationError);
    await expect(prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })).resolves.toMatchObject({ name: "Laptop" });
    expect(await prisma.event.count()).toBe(0);
  });

  it.each([
    ["quantity", "abc", { quantity: 2 }],
    ["purchasePrice", "abc", { purchasePrice: 499.99 }],
    ["purchaseDate", "2025-02-30", { purchaseDate: new Date("2025-01-15T00:00:00.000Z") }],
  ] as const)("invalid %s does not clear or change its existing value", async (field, value, expected) => {
    const { item } = await assetFixture();
    await expect(
      inventoryLifecycleService.updateInventoryItem(item.id, { [field]: value }),
    ).rejects.toBeInstanceOf(InventoryValidationError);
    await expect(prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })).resolves.toMatchObject(expected);
    expect(await prisma.event.count()).toBe(0);
  });

  it("explicit blanks clear optional price and date values", async () => {
    const { item } = await assetFixture();
    const updated = await inventoryLifecycleService.updateInventoryItem(item.id, {
      purchasePrice: "",
      purchaseDate: "",
    });
    expect(updated.purchasePrice).toBeNull();
    expect(updated.purchaseDate).toBeNull();
    expect(updated.serialNumber).toBe("Serial-1");
  });

  it("preserves unrelated and omitted fields", async () => {
    const { item } = await assetFixture();
    const updated = await inventoryLifecycleService.updateInventoryItem(item.id, { notes: "Changed" });
    expect(updated).toMatchObject({
      name: "Laptop",
      quantity: 2,
      manufacturer: "Acme",
      modelNumber: "Model-1",
      serialNumber: "Serial-1",
      purchasePrice: 499.99,
      notes: "Changed",
    });
  });

  it("rejects a stale category without modifying the existing relationship", async () => {
    const { item } = await assetFixture();
    const existingCategory = await category();
    await prisma.inventoryItem.update({ where: { id: item.id }, data: { categoryId: existingCategory.id } });
    await expect(
      inventoryLifecycleService.updateInventoryItem(item.id, { categoryId: "999999" }),
    ).rejects.toBeInstanceOf(InventoryValidationError);
    await expect(prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })).resolves.toMatchObject({ categoryId: existingCategory.id });
  });

  it("rejects nonexistent inventory consistently", async () => {
    await expect(
      inventoryLifecycleService.updateInventoryItem(999999, { name: "Missing" }),
    ).rejects.toBeInstanceOf(InventoryNotFoundError);
  });

  it("preserves asset metadata when changing to standard item", async () => {
    const { item } = await assetFixture();
    const updated = await inventoryLifecycleService.updateInventoryItem(item.id, {
      inventoryType: "STANDARD_ITEM",
    });
    expect(updated).toMatchObject({
      inventoryType: InventoryType.STANDARD_ITEM,
      manufacturer: "Acme",
      modelNumber: "Model-1",
      serialNumber: "Serial-1",
      purchasePrice: 499.99,
    });
  });

  it("includes bounded change context in the edit event", async () => {
    const { item } = await assetFixture();
    await inventoryLifecycleService.updateInventoryItem(item.id, {
      quantity: "4",
      notes: "New notes",
    });
    await expect(
      prisma.event.findFirstOrThrow({ where: { eventType: "inventory.edited" } }),
    ).resolves.toMatchObject({
      metadata: expect.objectContaining({ changedFields: ["quantity", "notes"] }),
    });
  });
});

describe("inventory action state", () => {
  const emptyState = { message: null, fieldErrors: {}, values: null };

  it("maps create field errors and preserves submitted values", async () => {
    const target = await container();
    const formData = new FormData();
    formData.set("name", " My item ");
    formData.set("inventoryType", "ASSET");
    formData.set("quantity", "abc");
    formData.set("purchasePrice", "499.99");
    const state = await createInventoryAction(target.id, emptyState, formData);
    expect(state).toMatchObject({
      fieldErrors: { quantity: "Enter a whole number greater than zero." },
      values: {
        name: " My item ",
        inventoryType: "ASSET",
        quantity: "abc",
        purchasePrice: "499.99",
      },
    });
  });

  it("maps missing inventory to a stable edit action error", async () => {
    const formData = new FormData();
    formData.set("name", "Missing");
    const state = await updateInventoryAction(999999, emptyState, formData);
    expect(state).toEqual({
      message: "Inventory item not found.",
      fieldErrors: {},
      values: { name: "Missing" },
    });
  });
});
