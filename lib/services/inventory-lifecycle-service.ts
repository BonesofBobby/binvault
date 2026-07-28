import { prisma } from "@/lib/db/prisma";
import { localFilesystemStorageProvider } from "@/lib/storage/local-filesystem-storage-provider";
import type { StorageProvider } from "@/lib/storage/storage-provider";

export type InventoryLifecycleDependencies = {
  storageProvider?: StorageProvider;
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
            containerId: true,
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
