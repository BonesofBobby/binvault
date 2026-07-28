import {
  InventoryType,
  MediaType,
} from "@prisma/client";
import {
  describe,
  expect,
  it,
} from "vitest";

import { prisma } from "@/lib/db/prisma";
import {
  InventoryMoveValidationError,
  InventoryNotFoundError,
  createInventoryLifecycleService,
} from "@/lib/services/inventory-lifecycle-service";
import type {
  SaveFileInput,
  StorageProvider,
  StoredFile,
} from "@/lib/storage/storage-provider";

class FakeStorageProvider implements StorageProvider {
  readonly deletedPaths: string[] = [];
  readonly existingPaths = new Set<string>();
  readonly failingPaths = new Set<string>();
  beforeDelete?: (storagePath: string) => Promise<void>;

  async save(input: SaveFileInput): Promise<StoredFile> {
    const storagePath = `test/${input.fileName}`;
    this.existingPaths.add(storagePath);
    return {
      fileName: input.fileName,
      storagePath,
      publicUrl: `/test/${input.fileName}`,
      sizeBytes: input.data.byteLength,
    };
  }

  async delete(storagePath: string) {
    await this.beforeDelete?.(storagePath);
    this.deletedPaths.push(storagePath);
    if (this.failingPaths.has(storagePath)) {
      throw new Error("Simulated storage failure.");
    }
    this.existingPaths.delete(storagePath);
  }

  async exists(storagePath: string) {
    return this.existingPaths.has(storagePath);
  }

  getPublicUrl(storagePath: string) {
    return `/test/${storagePath}`;
  }
}

async function createContainer(binNumber: string, name: string) {
  return prisma.container.create({
    data: {
      binNumber,
      name,
    },
  });
}

async function createInventoryFixture() {
  const [source, destination] = await Promise.all([
    createContainer("BIN-001", "Source"),
    createContainer("BIN-002", "Destination"),
  ]);
  const category = await prisma.category.create({
    data: {
      name: "Tools",
    },
  });
  const oldTimestamp = new Date("2025-01-01T00:00:00.000Z");
  const item = await prisma.inventoryItem.create({
    data: {
      name: "Cordless Drill",
      inventoryType: InventoryType.ASSET,
      quantity: 2,
      condition: "Good",
      notes: "Keep charged",
      manufacturer: "Acme",
      modelNumber: "D-100",
      serialNumber: "SERIAL-1",
      purchasePrice: 149.99,
      containerId: source.id,
      categoryId: category.id,
      createdAt: oldTimestamp,
      updatedAt: oldTimestamp,
    },
  });

  return {
    source,
    destination,
    category,
    item,
  };
}

describe("Inventory lifecycle service", () => {
  it("retrieves lifecycle details and excludes the current container from destinations", async () => {
    const { source, destination, item } =
      await createInventoryFixture();
    const service = createInventoryLifecycleService({
      storageProvider: new FakeStorageProvider(),
    });

    const [detail, moveOptions] = await Promise.all([
      service.getInventoryItem(item.id),
      service.getMoveOptions(item.id),
    ]);

    expect(detail).toMatchObject({
      id: item.id,
      containerId: source.id,
      container: {
        id: source.id,
      },
    });
    expect(moveOptions.destinations).toEqual([
      expect.objectContaining({
        id: destination.id,
      }),
    ]);
    expect(moveOptions.destinations).not.toContainEqual(
      expect.objectContaining({
        id: source.id,
      }),
    );
  });

  it("moves an item to a valid destination and preserves its lifecycle data", async () => {
    const { source, destination, category, item } =
      await createInventoryFixture();
    const service = createInventoryLifecycleService({
      storageProvider: new FakeStorageProvider(),
    });
    const media = await prisma.media.create({
      data: {
        inventoryId: item.id,
        mediaType: MediaType.PHOTO,
        fileName: "drill.jpg",
        originalName: "drill.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 10,
        storagePath: "test/drill.jpg",
      },
    });

    const result = await service.moveInventoryItem(
      item.id,
      destination.id,
    );
    const moved = await prisma.inventoryItem.findUniqueOrThrow({
      where: {
        id: item.id,
      },
      include: {
        media: true,
      },
    });

    expect(result).toMatchObject({
      previousContainerId: source.id,
      destinationContainerId: destination.id,
    });
    expect(moved).toMatchObject({
      id: item.id,
      name: "Cordless Drill",
      inventoryType: InventoryType.ASSET,
      quantity: 2,
      condition: "Good",
      notes: "Keep charged",
      manufacturer: "Acme",
      modelNumber: "D-100",
      serialNumber: "SERIAL-1",
      purchasePrice: 149.99,
      categoryId: category.id,
      containerId: destination.id,
      media: [
        expect.objectContaining({
          id: media.id,
        }),
      ],
    });
    expect(moved.createdAt).toEqual(item.createdAt);
    expect(moved.updatedAt.getTime()).toBeGreaterThan(
      item.updatedAt.getTime(),
    );
  });

  it("rejects the current container as a destination", async () => {
    const { source, item } = await createInventoryFixture();
    const service = createInventoryLifecycleService();

    await expect(
      service.moveInventoryItem(item.id, source.id),
    ).rejects.toMatchObject({
      name: "InventoryMoveValidationError",
      destinationError: "Select a different container.",
    });
  });

  it("rejects invalid and stale destination containers", async () => {
    const { destination, item } =
      await createInventoryFixture();
    const service = createInventoryLifecycleService();

    await expect(
      service.moveInventoryItem(item.id, 0),
    ).rejects.toBeInstanceOf(InventoryMoveValidationError);

    await prisma.container.delete({
      where: {
        id: destination.id,
      },
    });

    await expect(
      service.moveInventoryItem(item.id, destination.id),
    ).rejects.toMatchObject({
      destinationError:
        "The selected container is no longer available.",
    });
  });

  it("reports missing inventory consistently", async () => {
    const service = createInventoryLifecycleService();

    await expect(service.getInventoryItem(999_999)).resolves.toBeNull();
    await expect(
      service.getMoveOptions(999_999),
    ).rejects.toBeInstanceOf(InventoryNotFoundError);
    await expect(
      service.moveInventoryItem(999_999, 1),
    ).rejects.toBeInstanceOf(InventoryNotFoundError);
    await expect(
      service.evaluateInventoryDeletion(999_999),
    ).rejects.toBeInstanceOf(InventoryNotFoundError);
    await expect(
      service.deleteInventoryItem(999_999),
    ).rejects.toBeInstanceOf(InventoryNotFoundError);
  });

  it("evaluates deletion impact without exposing storage paths", async () => {
    const { item } = await createInventoryFixture();
    const service = createInventoryLifecycleService();
    await prisma.media.createMany({
      data: [
        {
          inventoryId: item.id,
          mediaType: MediaType.PHOTO,
          fileName: "one.jpg",
          originalName: "one.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1,
          storagePath: "test/one.jpg",
        },
        {
          inventoryId: item.id,
          mediaType: MediaType.MANUAL,
          fileName: "manual.pdf",
          originalName: "manual.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1,
          storagePath: "test/manual.pdf",
        },
      ],
    });

    await expect(
      service.evaluateInventoryDeletion(item.id),
    ).resolves.toEqual({
      id: item.id,
      name: item.name,
      mediaCount: 2,
    });
  });

  it("deletes an item without media", async () => {
    const { item } = await createInventoryFixture();
    const storageProvider = new FakeStorageProvider();
    const service = createInventoryLifecycleService({
      storageProvider,
    });

    const result = await service.deleteInventoryItem(item.id);

    expect(result).toMatchObject({
      id: item.id,
      mediaCount: 0,
      failedMediaCleanupCount: 0,
    });
    expect(storageProvider.deletedPaths).toEqual([]);
    await expect(
      prisma.inventoryItem.findUnique({
        where: {
          id: item.id,
        },
      }),
    ).resolves.toBeNull();
  });

  it("deletes one associated media record and file after the database commit", async () => {
    const { item } = await createInventoryFixture();
    const storageProvider = new FakeStorageProvider();
    const service = createInventoryLifecycleService({
      storageProvider,
    });
    storageProvider.existingPaths.add("test/single.jpg");
    await prisma.media.create({
      data: {
        inventoryId: item.id,
        mediaType: MediaType.PHOTO,
        fileName: "single.jpg",
        originalName: "single.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1,
        storagePath: "test/single.jpg",
      },
    });
    storageProvider.beforeDelete = async () => {
      await expect(
        prisma.inventoryItem.findUnique({
          where: {
            id: item.id,
          },
        }),
      ).resolves.toBeNull();
      await expect(
        prisma.media.count({
          where: {
            inventoryId: item.id,
          },
        }),
      ).resolves.toBe(0);
    };

    const result = await service.deleteInventoryItem(item.id);

    expect(result).toMatchObject({
      mediaCount: 1,
      failedMediaCleanupCount: 0,
    });
    expect(storageProvider.deletedPaths).toEqual([
      "test/single.jpg",
    ]);
    await expect(
      storageProvider.exists("test/single.jpg"),
    ).resolves.toBe(false);
  });

  it("deletes multiple media records and only their owned files", async () => {
    const { item } = await createInventoryFixture();
    const storageProvider = new FakeStorageProvider();
    const service = createInventoryLifecycleService({
      storageProvider,
    });
    storageProvider.existingPaths.add("test/one.jpg");
    storageProvider.existingPaths.add("test/two.pdf");
    storageProvider.existingPaths.add("test/unrelated.jpg");
    await prisma.media.createMany({
      data: [
        {
          inventoryId: item.id,
          mediaType: MediaType.PHOTO,
          fileName: "one.jpg",
          originalName: "one.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1,
          storagePath: "test/one.jpg",
        },
        {
          inventoryId: item.id,
          mediaType: MediaType.DOCUMENT,
          fileName: "two.pdf",
          originalName: "two.pdf",
          mimeType: "application/pdf",
          sizeBytes: 2,
          storagePath: "test/two.pdf",
        },
      ],
    });

    const result = await service.deleteInventoryItem(item.id);

    expect(result).toMatchObject({
      mediaCount: 2,
      failedMediaCleanupCount: 0,
    });
    expect(storageProvider.deletedPaths.sort()).toEqual([
      "test/one.jpg",
      "test/two.pdf",
    ]);
    await expect(
      prisma.media.count({
        where: {
          inventoryId: item.id,
        },
      }),
    ).resolves.toBe(0);
    await expect(
      storageProvider.exists("test/unrelated.jpg"),
    ).resolves.toBe(true);
  });

  it("reports partial storage cleanup failures after completing database deletion", async () => {
    const { item } = await createInventoryFixture();
    const storageProvider = new FakeStorageProvider();
    const service = createInventoryLifecycleService({
      storageProvider,
    });
    storageProvider.existingPaths.add("test/kept.jpg");
    storageProvider.existingPaths.add("test/deleted.jpg");
    storageProvider.failingPaths.add("test/kept.jpg");
    await prisma.media.createMany({
      data: [
        {
          inventoryId: item.id,
          mediaType: MediaType.PHOTO,
          fileName: "kept.jpg",
          originalName: "kept.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1,
          storagePath: "test/kept.jpg",
        },
        {
          inventoryId: item.id,
          mediaType: MediaType.PHOTO,
          fileName: "deleted.jpg",
          originalName: "deleted.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1,
          storagePath: "test/deleted.jpg",
        },
      ],
    });

    const result = await service.deleteInventoryItem(item.id);

    expect(result.failedMediaCleanupCount).toBe(1);
    await expect(
      prisma.inventoryItem.findUnique({
        where: {
          id: item.id,
        },
      }),
    ).resolves.toBeNull();
    await expect(
      prisma.media.count({
        where: {
          inventoryId: item.id,
        },
      }),
    ).resolves.toBe(0);
    await expect(
      storageProvider.exists("test/kept.jpg"),
    ).resolves.toBe(true);
    await expect(
      storageProvider.exists("test/deleted.jpg"),
    ).resolves.toBe(false);
  });

  it("does not request file cleanup when database deletion cannot begin", async () => {
    const storageProvider = new FakeStorageProvider();
    const service = createInventoryLifecycleService({
      storageProvider,
    });

    await expect(
      service.deleteInventoryItem(999_999),
    ).rejects.toBeInstanceOf(InventoryNotFoundError);
    expect(storageProvider.deletedPaths).toEqual([]);
  });
});
