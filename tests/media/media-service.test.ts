import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { createMediaService } from "@/lib/services/media-service";
import type { SaveFileInput, StorageProvider } from "@/lib/storage/storage-provider";

class FakeStorageProvider implements StorageProvider {
  readonly files = new Set<string>();
  failDelete = false;

  async save(input: SaveFileInput) {
    const storagePath = `${input.directory}/${input.fileName}`;
    this.files.add(storagePath);
    return {
      fileName: input.fileName,
      storagePath,
      publicUrl: `/uploads/${storagePath}`,
      sizeBytes: input.data.byteLength,
    };
  }

  async delete(storagePath: string) {
    if (this.failDelete) throw new Error("storage delete failed");
    this.files.delete(storagePath);
  }

  async exists(storagePath: string) {
    return this.files.has(storagePath);
  }

  getPublicUrl(storagePath: string) {
    return `/uploads/${storagePath}`;
  }
}

async function createInventory() {
  const container = await prisma.container.create({
    data: { binNumber: "MEDIA", name: "Media Container" },
  });
  return prisma.inventoryItem.create({
    data: { name: "Camera", containerId: container.id },
  });
}

describe("Media event history", () => {
  it("records upload and deletion events without storage paths", async () => {
    const inventory = await createInventory();
    const storage = new FakeStorageProvider();
    const service = createMediaService({ storageProvider: storage });
    const media = await service.saveInventoryPhoto({
      inventoryId: inventory.id,
      originalName: "/private/example/camera.jpg",
      mimeType: "image/jpeg",
      data: Buffer.from("image"),
    });

    await service.deleteMedia(media.id);

    const events = await prisma.event.findMany({ orderBy: { id: "asc" } });
    expect(events.map((event) => event.eventType)).toEqual([
      "media.uploaded",
      "media.deleted",
    ]);
    expect(events.every((event) => event.entityId === String(inventory.id))).toBe(true);
    expect(events[0]).toMatchObject({
      summary: `Uploaded camera.jpg to inventory item ${inventory.id}.`,
      metadata: expect.objectContaining({ originalName: "camera.jpg" }),
    });
    expect(JSON.stringify(events.map((event) => event.metadata))).not.toContain(
      media.storagePath,
    );
    expect(JSON.stringify(events)).not.toContain("/private/example");
    await expect(prisma.media.findUnique({ where: { id: media.id } })).resolves.toBeNull();
  });

  it("does not record deletion success when filesystem deletion fails", async () => {
    const inventory = await createInventory();
    const storage = new FakeStorageProvider();
    const service = createMediaService({ storageProvider: storage });
    const media = await service.saveInventoryPhoto({
      inventoryId: inventory.id,
      originalName: "camera.jpg",
      mimeType: "image/jpeg",
      data: Buffer.from("image"),
    });
    storage.failDelete = true;

    await expect(service.deleteMedia(media.id)).rejects.toThrow("storage delete failed");
    await expect(
      prisma.event.count({ where: { eventType: "media.deleted" } }),
    ).resolves.toBe(0);
    await expect(prisma.media.findUnique({ where: { id: media.id } })).resolves.not.toBeNull();
  });
});
