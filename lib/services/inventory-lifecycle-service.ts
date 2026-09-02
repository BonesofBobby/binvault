import { InventoryType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { recordEvent } from "@/lib/services/event-service";
import { localFilesystemStorageProvider } from "@/lib/storage/local-filesystem-storage-provider";
import type { StorageProvider } from "@/lib/storage/storage-provider";

export type InventoryLifecycleDependencies = {
  storageProvider?: StorageProvider;
};

export const INVENTORY_FIELDS = [
  "name",
  "inventoryType",
  "quantity",
  "categoryId",
  "condition",
  "notes",
  "manufacturer",
  "modelNumber",
  "serialNumber",
  "purchaseDate",
  "purchasePrice",
  "warrantyEnd",
  "partNumber",
  "replacementIntervalDays",
  "minimumQuantity",
  "documentType",
  "expirationDate",
] as const;

export type InventoryField = (typeof INVENTORY_FIELDS)[number];
export type InventoryMutationInput = Partial<Record<InventoryField, string>>;
export type InventoryFieldErrors = Partial<Record<InventoryField, string>>;

export class InventoryValidationError extends Error {
  constructor(
    message: string,
    readonly fieldErrors: InventoryFieldErrors,
  ) {
    super(message);
    this.name = "InventoryValidationError";
  }
}

export class InventoryContainerNotFoundError extends Error {
  constructor() {
    super("The selected container is no longer available.");
    this.name = "InventoryContainerNotFoundError";
  }
}

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

type InventoryDatabase = Pick<
  Prisma.TransactionClient,
  "category" | "container"
>;

type ExistingInventory = {
  name: string;
  inventoryType: InventoryType;
  quantity: number;
  categoryId: number | null;
  condition: string | null;
  notes: string | null;
  manufacturer: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  purchaseDate: Date | null;
  purchasePrice: number | null;
  warrantyEnd: Date | null;
  partNumber: string | null;
  replacementIntervalDays: number | null;
  minimumQuantity: number | null;
  documentType: string | null;
  expirationDate: Date | null;
};

const STRING_LIMITS: Partial<Record<InventoryField, number>> = {
  name: 200,
  condition: 100,
  notes: 2_000,
  manufacturer: 100,
  modelNumber: 100,
  serialNumber: 100,
  partNumber: 100,
  documentType: 100,
};

function hasField(input: InventoryMutationInput, field: InventoryField) {
  return Object.prototype.hasOwnProperty.call(input, field);
}

function optionalString(
  input: InventoryMutationInput,
  field: InventoryField,
  existing: string | null,
  fieldErrors: InventoryFieldErrors,
) {
  if (!hasField(input, field)) return existing;
  const value = input[field]?.trim() ?? "";
  const maximum = STRING_LIMITS[field] ?? 100;
  if (value.length > maximum) {
    fieldErrors[field] = `Use ${maximum.toLocaleString()} characters or fewer.`;
  }
  return value || null;
}

function positiveInteger(
  input: InventoryMutationInput,
  field: InventoryField,
  existing: number,
  fieldErrors: InventoryFieldErrors,
) {
  if (!hasField(input, field)) return existing;
  const raw = input[field]?.trim() ?? "";
  const value = Number(raw);
  if (!raw || !Number.isInteger(value) || value <= 0) {
    fieldErrors[field] = "Enter a whole number greater than zero.";
    return existing;
  }
  return value;
}

function optionalInteger(
  input: InventoryMutationInput,
  field: InventoryField,
  existing: number | null,
  minimum: number,
  fieldErrors: InventoryFieldErrors,
) {
  if (!hasField(input, field)) return existing;
  const raw = input[field]?.trim() ?? "";
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum) {
    fieldErrors[field] =
      minimum === 0
        ? "Enter a whole number of zero or greater."
        : "Enter a whole number greater than zero.";
    return existing;
  }
  return value;
}

function optionalPrice(
  input: InventoryMutationInput,
  existing: number | null,
  fieldErrors: InventoryFieldErrors,
) {
  if (!hasField(input, "purchasePrice")) return existing;
  const raw = input.purchasePrice?.trim() ?? "";
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    fieldErrors.purchasePrice = "Enter a valid non-negative price.";
    return existing;
  }
  return value;
}

function optionalDate(
  input: InventoryMutationInput,
  field: "purchaseDate" | "warrantyEnd" | "expirationDate",
  existing: Date | null,
  fieldErrors: InventoryFieldErrors,
) {
  if (!hasField(input, field)) return existing;
  const raw = input[field]?.trim() ?? "";
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) {
    fieldErrors[field] = "Enter a valid date.";
    return existing;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = new Date(Date.UTC(year, month - 1, day));
  if (
    value.getUTCFullYear() !== year ||
    value.getUTCMonth() !== month - 1 ||
    value.getUTCDate() !== day
  ) {
    fieldErrors[field] = "Enter a valid date.";
    return existing;
  }
  return value;
}

async function validateInventoryMutation(
  database: InventoryDatabase,
  input: InventoryMutationInput,
  existing?: ExistingInventory,
) {
  const fieldErrors: InventoryFieldErrors = {};
  const name = hasField(input, "name")
    ? input.name?.trim() ?? ""
    : existing?.name ?? "";
  if (!name) fieldErrors.name = "An inventory name is required.";
  if (name.length > (STRING_LIMITS.name ?? 200)) {
    fieldErrors.name = "Use 200 characters or fewer.";
  }

  const rawType = hasField(input, "inventoryType")
    ? input.inventoryType?.trim() ?? ""
    : existing?.inventoryType ?? "";
  const inventoryType = Object.values(InventoryType).includes(
    rawType as InventoryType,
  )
    ? (rawType as InventoryType)
    : existing?.inventoryType ?? InventoryType.STANDARD_ITEM;
  if (!Object.values(InventoryType).includes(rawType as InventoryType)) {
    fieldErrors.inventoryType = "Select a valid inventory type.";
  }

  const quantity = positiveInteger(
    input,
    "quantity",
    existing?.quantity ?? 1,
    fieldErrors,
  );

  let categoryId = existing?.categoryId ?? null;
  if (hasField(input, "categoryId")) {
    const raw = input.categoryId?.trim() ?? "";
    if (!raw) {
      categoryId = null;
    } else {
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        fieldErrors.categoryId = "Select a valid category.";
      } else {
        const category = await database.category.findUnique({
          where: { id: parsed },
          select: { id: true },
        });
        if (!category) {
          fieldErrors.categoryId = "The selected category is no longer available.";
        } else {
          categoryId = parsed;
        }
      }
    }
  }

  const data = {
    name,
    inventoryType,
    quantity,
    categoryId,
    condition: optionalString(input, "condition", existing?.condition ?? null, fieldErrors),
    notes: optionalString(input, "notes", existing?.notes ?? null, fieldErrors),
    manufacturer: optionalString(input, "manufacturer", existing?.manufacturer ?? null, fieldErrors),
    modelNumber: optionalString(input, "modelNumber", existing?.modelNumber ?? null, fieldErrors),
    serialNumber: optionalString(input, "serialNumber", existing?.serialNumber ?? null, fieldErrors),
    purchaseDate: optionalDate(input, "purchaseDate", existing?.purchaseDate ?? null, fieldErrors),
    purchasePrice: optionalPrice(input, existing?.purchasePrice ?? null, fieldErrors),
    warrantyEnd: optionalDate(input, "warrantyEnd", existing?.warrantyEnd ?? null, fieldErrors),
    partNumber: optionalString(input, "partNumber", existing?.partNumber ?? null, fieldErrors),
    replacementIntervalDays: optionalInteger(
      input,
      "replacementIntervalDays",
      existing?.replacementIntervalDays ?? null,
      1,
      fieldErrors,
    ),
    minimumQuantity: optionalInteger(
      input,
      "minimumQuantity",
      existing?.minimumQuantity ?? null,
      0,
      fieldErrors,
    ),
    documentType: optionalString(input, "documentType", existing?.documentType ?? null, fieldErrors),
    expirationDate: optionalDate(input, "expirationDate", existing?.expirationDate ?? null, fieldErrors),
  };

  if (Object.keys(fieldErrors).length > 0) {
    throw new InventoryValidationError(
      "Review the highlighted inventory information.",
      fieldErrors,
    );
  }
  return data;
}

function changedFields(
  existing: ExistingInventory,
  updated: ExistingInventory,
) {
  return INVENTORY_FIELDS.filter((field) => {
    const before = existing[field as keyof ExistingInventory];
    const after = updated[field as keyof ExistingInventory];
    if (before instanceof Date || after instanceof Date) {
      return (before as Date | null)?.getTime() !== (after as Date | null)?.getTime();
    }
    return before !== after;
  });
}

export function createInventoryLifecycleService(
  dependencies: InventoryLifecycleDependencies = {},
) {
  const storageProvider =
    dependencies.storageProvider ?? localFilesystemStorageProvider;

  return {
    async createInventoryItem(
      containerId: number,
      input: InventoryMutationInput,
    ) {
      if (!isValidId(containerId)) {
        throw new InventoryContainerNotFoundError();
      }

      return prisma.$transaction(async (transaction) => {
        const container = await transaction.container.findUnique({
          where: { id: containerId },
          select: { id: true, name: true, binNumber: true },
        });
        if (!container) {
          throw new InventoryContainerNotFoundError();
        }

        const data = await validateInventoryMutation(transaction, input);
        const item = await transaction.inventoryItem.create({
          data: { ...data, containerId },
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
      input: InventoryMutationInput,
    ) {
      if (!isValidId(inventoryId)) {
        throw new InventoryNotFoundError();
      }

      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.inventoryItem.findUnique({
          where: { id: inventoryId },
        });
        if (!existing) {
          throw new InventoryNotFoundError();
        }

        const data = await validateInventoryMutation(
          transaction,
          input,
          existing,
        );
        const item = await transaction.inventoryItem.update({
          where: { id: inventoryId },
          data,
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
              changedFields: changedFields(existing, item),
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
