import { InventoryType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { recordEvent } from "@/lib/services/event-service";
import { localFilesystemStorageProvider } from "@/lib/storage/local-filesystem-storage-provider";
import type { StorageProvider } from "@/lib/storage/storage-provider";

export type InventoryLifecycleDependencies = {
  storageProvider?: StorageProvider;
};

export type InventoryManagementInput = {
  name: string;
  inventoryType: InventoryType;
  quantity: number;
  categoryId: number | null;
  condition: string | null;
  notes: string | null;
  manufacturer?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  purchaseDate?: Date | null;
  purchasePrice?: number | null;
  warrantyEnd?: Date | null;
  partNumber?: string | null;
  replacementIntervalDays?: number | null;
  minimumQuantity?: number | null;
  documentType?: string | null;
  expirationDate?: Date | null;
};

export class InventoryNotFoundError extends Error {
  constructor() {
    super("Inventory item not found.");
    this.name = "InventoryNotFoundError";
  }
}

export class InventoryMoveValidationError extends Error {
  constructor(readonly destinationError: string) {
    super("The inventory item could not be moved.");
    this.name = "InventoryMoveValidationError";
  }
}

function isValidId(value: number) {
  return Number.isInteger(value) && value > 0;
}

export function createInventoryLifecycleService(
  dependencies: InventoryLifecycleDependencies = {},
) {
  const storageProvider =
    dependencies.storageProvider ?? localFilesystemStorageProvider;

  return {
    async createInventoryItem(
      containerId: number,
      input: InventoryManagementInput,
    ) {
      if (!isValidId(containerId)) {
        throw new Error("Container not found.");
      }

      return prisma.$transaction(async (transaction) => {
        const container = await transaction.container.findUnique({
          where: { id: containerId },
          select: { id: true, name: true, binNumber: true },
        });
        if (!container) {
          throw new Error("Container not found.");
        }

        const item = await transaction.inventoryItem.create({
          data: { ...input, containerId },
        });
        await recordEvent(
          {
            eventType: "inventory.created",
            entityType: "inventory",
            entityId: item.id,
            summary: `Created inventory item ${item.name}.`,
            metadata: {
              itemName: item.name,
              containerId,
              containerName: container.name,
              containerBinNumber: container.binNumber,
              inventoryType: item.inventoryType,
              quantity: item.quantity,
            },
          },
          transaction,
        );
        return item;
      });
    },

    async updateInventoryItem(
      inventoryId: number,
      input: InventoryManagementInput,
    ) {
      if (!isValidId(inventoryId)) {
        throw new InventoryNotFoundError();
      }

      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.inventoryItem.findUnique({
          where: { id: inventoryId },
          select: { id: true, name: true, containerId: true },
        });
        if (!existing) {
          throw new InventoryNotFoundError();
        }

        const item = await transaction.inventoryItem.update({
          where: { id: inventoryId },
          data: input,
        });
        await recordEvent(
          {
            eventType: "inventory.edited",
            entityType: "inventory",
            entityId: item.id,
            summary: `Edited inventory item ${item.name}.`,
            metadata: {
              itemName: item.name,
              previousItemName: existing.name,
              containerId: item.containerId,
              inventoryType: item.inventoryType,
              quantity: item.quantity,
            },
          },
          transaction,
        );
        return item;
      });
    },

    async getInventoryItem(inventoryId: number) {
      if (!isValidId(inventoryId)) {
        return null;
      }

      return prisma.inventoryItem.findUnique({
        where: {
          id: inventoryId,
        },
        include: {
          category: true,
          _count: {
            select: {
              media: true,
            },
          },
          container: {
            include: {
              location: true,
              containerType: true,
            },
          },
        },
      });
    },

    async getMoveOptions(inventoryId: number) {
      if (!isValidId(inventoryId)) {
        throw new InventoryNotFoundError();
      }

      const item = await prisma.inventoryItem.findUnique({
        where: {
          id: inventoryId,
        },
        select: {
          id: true,
          name: true,
          containerId: true,
          container: {
            select: {
              id: true,
              binNumber: true,
              name: true,
              location: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!item) {
        throw new InventoryNotFoundError();
      }

      const destinations = await prisma.container.findMany({
        where: {
          id: {
            not: item.containerId,
          },
        },
        select: {
          id: true,
          binNumber: true,
          name: true,
          location: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [
          {
            binNumber: "asc",
          },
          {
            id: "asc",
          },
        ],
      });

      return {
        item,
        destinations,
      };
    },

    async moveInventoryItem(
      inventoryId: number,
      destinationContainerId: number,
    ) {
      if (!isValidId(inventoryId)) {
        throw new InventoryNotFoundError();
      }

      if (!isValidId(destinationContainerId)) {
        throw new InventoryMoveValidationError(
          "Select a valid destination container.",
        );
      }

      return prisma.$transaction(async (transaction) => {
        const item = await transaction.inventoryItem.findUnique({
          where: {
            id: inventoryId,
          },
          select: {
            id: true,
            name: true,
            containerId: true,
            container: { select: { name: true, binNumber: true } },
          },
        });

        if (!item) {
          throw new InventoryNotFoundError();
        }

        if (item.containerId === destinationContainerId) {
          throw new InventoryMoveValidationError(
            "Select a different container.",
          );
        }

        const destination =
          await transaction.container.findUnique({
            where: {
              id: destinationContainerId,
            },
            select: {
              id: true,
              name: true,
              binNumber: true,
            },
          });

        if (!destination) {
          throw new InventoryMoveValidationError(
            "The selected container is no longer available.",
          );
        }

        const movedItem = await transaction.inventoryItem.update({
          where: {
            id: inventoryId,
          },
          data: {
            containerId: destinationContainerId,
          },
        });

        await recordEvent(
          {
            eventType: "inventory.moved",
            entityType: "inventory",
            entityId: movedItem.id,
            summary: `Moved ${item.name} from ${item.container.name} to ${destination.name}.`,
            metadata: {
              itemName: item.name,
              sourceContainerId: item.containerId,
              sourceContainerName: item.container.name,
              sourceContainerBinNumber: item.container.binNumber,
              destinationContainerId,
              destinationContainerName: destination.name,
              destinationContainerBinNumber: destination.binNumber,
            },
          },
          transaction,
        );

        return {
          item: movedItem,
          previousContainerId: item.containerId,
          destinationContainerId,
        };
      });
    },

    async evaluateInventoryDeletion(inventoryId: number) {
      if (!isValidId(inventoryId)) {
        throw new InventoryNotFoundError();
      }

      const item = await prisma.inventoryItem.findUnique({
        where: {
          id: inventoryId,
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              media: true,
            },
          },
        },
      });

      if (!item) {
        throw new InventoryNotFoundError();
      }

      return {
        id: item.id,
        name: item.name,
        mediaCount: item._count.media,
      };
    },

    async deleteInventoryItem(inventoryId: number) {
      if (!isValidId(inventoryId)) {
        throw new InventoryNotFoundError();
      }

      const deleted = await prisma.$transaction(
        async (transaction) => {
          const item =
            await transaction.inventoryItem.findUnique({
              where: {
                id: inventoryId,
              },
              select: {
                id: true,
                name: true,
                containerId: true,
                inventoryType: true,
                quantity: true,
                category: { select: { id: true, name: true } },
                container: { select: { name: true, binNumber: true } },
                media: {
                  select: {
                    storagePath: true,
                  },
                },
              },
            });

          if (!item) {
            throw new InventoryNotFoundError();
          }

          await transaction.inventoryItem.delete({
            where: {
              id: item.id,
            },
          });

          await recordEvent(
            {
              eventType: "inventory.deleted",
              entityType: "inventory",
              entityId: item.id,
              summary: `Deleted inventory item ${item.name}.`,
              metadata: {
                itemName: item.name,
                formerContainerId: item.containerId,
                formerContainerName: item.container.name,
                formerContainerBinNumber: item.container.binNumber,
                categoryId: item.category?.id ?? null,
                categoryName: item.category?.name ?? null,
                inventoryType: item.inventoryType,
                quantity: item.quantity,
                mediaCount: item.media.length,
              },
            },
            transaction,
          );

          return item;
        },
      );

      const cleanupResults = await Promise.allSettled(
        deleted.media.map(({ storagePath }) =>
          storageProvider.delete(storagePath),
        ),
      );
      const failedMediaCleanupCount = cleanupResults.filter(
        (result) => result.status === "rejected",
      ).length;

      return {
        id: deleted.id,
        name: deleted.name,
        previousContainerId: deleted.containerId,
        mediaCount: deleted.media.length,
        failedMediaCleanupCount,
      };
    },
  };
}

export const inventoryLifecycleService =
  createInventoryLifecycleService();
