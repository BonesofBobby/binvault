import { randomUUID } from "node:crypto";
import path from "node:path";

import { MediaType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { localFilesystemStorageProvider } from "@/lib/storage/local-filesystem-storage-provider";
import type { StorageProvider } from "@/lib/storage/storage-provider";

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export type SaveInventoryPhotoInput = {
  inventoryId: number;
  originalName: string;
  mimeType: string;
  data: Buffer;
  caption?: string | null;
};

export type MediaServiceDependencies = {
  storageProvider?: StorageProvider;
};

function getSafeExtension(originalName: string, mimeType: string): string {
  const extensionFromName = path.extname(originalName).toLowerCase();

  const allowedExtensions = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
  ]);

  if (allowedExtensions.has(extensionFromName)) {
    return extensionFromName;
  }

  const extensionByMimeType: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };

  const extension = extensionByMimeType[mimeType];

  if (!extension) {
    throw new Error("Unable to determine a supported image extension.");
  }

  return extension;
}

function validatePhoto(input: SaveInventoryPhotoInput): void {
  if (!Number.isInteger(input.inventoryId) || input.inventoryId <= 0) {
    throw new Error("A valid inventory ID is required.");
  }

  if (!input.originalName.trim()) {
    throw new Error("The original file name is required.");
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(input.mimeType)) {
    throw new Error(
      "Unsupported image type. Use JPEG, PNG, WebP, or GIF.",
    );
  }

  if (input.data.byteLength === 0) {
    throw new Error("The selected image is empty.");
  }

  if (input.data.byteLength > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("The selected image exceeds the 10 MB size limit.");
  }
}

export function createMediaService(
  dependencies: MediaServiceDependencies = {},
) {
  const storageProvider =
    dependencies.storageProvider ?? localFilesystemStorageProvider;

  return {
    async getInventoryMedia(inventoryId: number) {
      return prisma.media.findMany({
        where: {
          inventoryId,
        },
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      });
    },

    async getInventoryPhotoCount(inventoryId: number): Promise<number> {
      return prisma.media.count({
        where: {
          inventoryId,
          mediaType: MediaType.PHOTO,
        },
      });
    },

    async saveInventoryPhoto(input: SaveInventoryPhotoInput) {
      validatePhoto(input);

      const inventoryItem = await prisma.inventoryItem.findUnique({
        where: {
          id: input.inventoryId,
        },
        select: {
          id: true,
        },
      });

      if (!inventoryItem) {
        throw new Error("Inventory item not found.");
      }

      const extension = getSafeExtension(
        input.originalName,
        input.mimeType,
      );

      const generatedFileName = `${randomUUID()}${extension}`;
      const directory = `inventory/${input.inventoryId}`;

      const existingPhotoCount = await this.getInventoryPhotoCount(
        input.inventoryId,
      );

      const storedFile = await storageProvider.save({
        fileName: generatedFileName,
        data: input.data,
        directory,
      });

      try {
        return await prisma.media.create({
          data: {
            inventoryId: input.inventoryId,
            mediaType: MediaType.PHOTO,
            fileName: storedFile.fileName,
            originalName: input.originalName,
            mimeType: input.mimeType,
            sizeBytes: storedFile.sizeBytes,
            storagePath: storedFile.storagePath,
            caption: input.caption?.trim() || null,
            sortOrder: existingPhotoCount,
          },
        });
      } catch (error) {
        await storageProvider.delete(storedFile.storagePath);
        throw error;
      }
    },

    async deleteMedia(mediaId: number): Promise<void> {
      if (!Number.isInteger(mediaId) || mediaId <= 0) {
        throw new Error("A valid media ID is required.");
      }

      const media = await prisma.media.findUnique({
        where: {
          id: mediaId,
        },
      });

      if (!media) {
        return;
      }

      await storageProvider.delete(media.storagePath);

      await prisma.media.delete({
        where: {
          id: media.id,
        },
      });
    },

    getPublicUrl(storagePath: string): string {
      return storageProvider.getPublicUrl(storagePath);
    },
  };
}

export const mediaService = createMediaService();