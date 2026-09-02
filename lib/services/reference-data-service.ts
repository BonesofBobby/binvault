import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { recordEvent } from "@/lib/services/event-service";

const MAX_NAME_LENGTH = 100;

export type ReferenceDataField = "name" | "parentId";
export type ReferenceDataFieldErrors = Partial<
  Record<ReferenceDataField, string>
>;

export class ReferenceDataValidationError extends Error {
  constructor(
    message: string,
    readonly fieldErrors: ReferenceDataFieldErrors,
  ) {
    super(message);
    this.name = "ReferenceDataValidationError";
  }
}

export class ReferenceDataNotFoundError extends Error {
  constructor(readonly entityLabel: string) {
    super(`${entityLabel} not found.`);
    this.name = "ReferenceDataNotFoundError";
  }
}

export class ReferenceDataDeletionBlockedError extends Error {
  constructor(
    message: string,
    readonly usageCount: number,
  ) {
    super(message);
    this.name = "ReferenceDataDeletionBlockedError";
  }
}

type ReferenceDatabase = Pick<
  Prisma.TransactionClient,
  "location" | "containerType" | "category"
>;

function normalizeName(name: string) {
  const normalized = name.trim();
  if (!normalized) {
    throw new ReferenceDataValidationError(
      "Review the highlighted information.",
      { name: "A name is required." },
    );
  }
  if (normalized.length > MAX_NAME_LENGTH) {
    throw new ReferenceDataValidationError(
      "Review the highlighted information.",
      { name: `Use ${MAX_NAME_LENGTH} characters or fewer.` },
    );
  }
  return normalized;
}

function validateId(id: number, label: string) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ReferenceDataNotFoundError(label);
  }
}

function mapUniqueNameError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new ReferenceDataValidationError(
      "Review the highlighted information.",
      { name: "That name is already in use." },
    );
  }
  throw error;
}

async function assertUniqueLocationName(
  database: ReferenceDatabase,
  name: string,
  parentId: number | null,
  existingId?: number,
) {
  const duplicate = await database.location.findFirst({
    where: {
      name,
      parentId,
      id: existingId ? { not: existingId } : undefined,
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new ReferenceDataValidationError(
      "Review the highlighted information.",
      { name: "A location with that name already exists at this level." },
    );
  }
}

async function validateLocationParent(
  database: ReferenceDatabase,
  locationId: number | undefined,
  parentId: number | null,
) {
  if (parentId === null) return;
  if (!Number.isInteger(parentId) || parentId <= 0) {
    throw new ReferenceDataValidationError(
      "Review the highlighted information.",
      { parentId: "Select a valid parent location." },
    );
  }
  if (locationId === parentId) {
    throw new ReferenceDataValidationError(
      "Review the highlighted information.",
      { parentId: "A location cannot be its own parent." },
    );
  }

  const parent = await database.location.findUnique({
    where: { id: parentId },
    select: { id: true, parentId: true },
  });
  if (!parent) {
    throw new ReferenceDataValidationError(
      "Review the highlighted information.",
      { parentId: "The selected parent location no longer exists." },
    );
  }

  if (!locationId) return;
  const seen = new Set<number>();
  let ancestor: { id: number; parentId: number | null } | null = parent;
  while (ancestor) {
    if (ancestor.id === locationId) {
      throw new ReferenceDataValidationError(
        "Review the highlighted information.",
        { parentId: "A descendant cannot be selected as the parent." },
      );
    }
    if (ancestor.parentId === null || seen.has(ancestor.parentId)) break;
    seen.add(ancestor.id);
    ancestor = await database.location.findUnique({
      where: { id: ancestor.parentId },
      select: { id: true, parentId: true },
    });
  }
}

export async function listLocations() {
  const locations = await prisma.location.findMany({
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { children: true, containers: true } },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });

  const byParent = new Map<number | null, typeof locations>();
  for (const location of locations) {
    const siblings = byParent.get(location.parentId) ?? [];
    siblings.push(location);
    byParent.set(location.parentId, siblings);
  }

  const flattened: Array<(typeof locations)[number] & { depth: number }> = [];
  const visited = new Set<number>();
  const append = (parentId: number | null, depth: number) => {
    for (const location of byParent.get(parentId) ?? []) {
      if (visited.has(location.id)) continue;
      visited.add(location.id);
      flattened.push({ ...location, depth });
      append(location.id, depth + 1);
    }
  };
  append(null, 0);
  for (const location of locations) {
    if (!visited.has(location.id)) flattened.push({ ...location, depth: 0 });
  }
  return flattened;
}

export async function getLocation(locationId: number) {
  if (!Number.isInteger(locationId) || locationId <= 0) return null;
  return prisma.location.findUnique({ where: { id: locationId } });
}

export async function createLocation(input: {
  name: string;
  parentId: number | null;
}) {
  const name = normalizeName(input.name);
  return prisma.$transaction(async (transaction) => {
    await validateLocationParent(transaction, undefined, input.parentId);
    await assertUniqueLocationName(transaction, name, input.parentId);
    const location = await transaction.location.create({
      data: { name, parentId: input.parentId },
    });
    await recordEvent(
      {
        eventType: "location.created",
        entityType: "location",
        entityId: location.id,
        summary: `Created location ${location.name}.`,
        metadata: { locationName: location.name, parentId: location.parentId },
      },
      transaction,
    );
    return location;
  });
}

export async function updateLocation(
  locationId: number,
  input: { name: string; parentId: number | null },
) {
  validateId(locationId, "Location");
  const name = normalizeName(input.name);
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.location.findUnique({
      where: { id: locationId },
    });
    if (!existing) throw new ReferenceDataNotFoundError("Location");
    await validateLocationParent(transaction, locationId, input.parentId);
    await assertUniqueLocationName(
      transaction,
      name,
      input.parentId,
      locationId,
    );
    const location = await transaction.location.update({
      where: { id: locationId },
      data: { name, parentId: input.parentId },
    });
    await recordEvent(
      {
        eventType: "location.edited",
        entityType: "location",
        entityId: location.id,
        summary: `Edited location ${location.name}.`,
        metadata: {
          locationName: location.name,
          previousLocationName: existing.name,
          parentId: location.parentId,
          previousParentId: existing.parentId,
        },
      },
      transaction,
    );
    return location;
  });
}

export async function evaluateLocationDeletion(locationId: number) {
  validateId(locationId, "Location");
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: {
      id: true,
      _count: { select: { children: true, containers: true } },
    },
  });
  if (!location) throw new ReferenceDataNotFoundError("Location");
  return {
    canDelete:
      location._count.children === 0 && location._count.containers === 0,
    childCount: location._count.children,
    containerCount: location._count.containers,
  };
}

export async function deleteLocation(locationId: number) {
  validateId(locationId, "Location");
  return prisma.$transaction(async (transaction) => {
    const location = await transaction.location.findUnique({
      where: { id: locationId },
      select: {
        id: true,
        name: true,
        parentId: true,
        _count: { select: { children: true, containers: true } },
      },
    });
    if (!location) throw new ReferenceDataNotFoundError("Location");
    if (location._count.containers > 0) {
      throw new ReferenceDataDeletionBlockedError(
        `This location is used by ${location._count.containers} ${location._count.containers === 1 ? "container" : "containers"}. Move them before deleting it.`,
        location._count.containers,
      );
    }
    if (location._count.children > 0) {
      throw new ReferenceDataDeletionBlockedError(
        `This location has ${location._count.children} child ${location._count.children === 1 ? "location" : "locations"}. Move or delete them first.`,
        location._count.children,
      );
    }
    await transaction.location.delete({ where: { id: location.id } });
    await recordEvent(
      {
        eventType: "location.deleted",
        entityType: "location",
        entityId: location.id,
        summary: `Deleted location ${location.name}.`,
        metadata: {
          locationName: location.name,
          formerParentId: location.parentId,
        },
      },
      transaction,
    );
  });
}

export async function listContainerTypes() {
  return prisma.containerType.findMany({
    include: { _count: { select: { containers: true } } },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}

export async function getContainerType(containerTypeId: number) {
  if (!Number.isInteger(containerTypeId) || containerTypeId <= 0) return null;
  return prisma.containerType.findUnique({ where: { id: containerTypeId } });
}

export async function createContainerType(input: { name: string }) {
  const name = normalizeName(input.name);
  try {
    return await prisma.$transaction(async (transaction) => {
      const containerType = await transaction.containerType.create({ data: { name } });
      await recordEvent(
        {
          eventType: "containerType.created",
          entityType: "containerType",
          entityId: containerType.id,
          summary: `Created container type ${containerType.name}.`,
          metadata: { containerTypeName: containerType.name },
        },
        transaction,
      );
      return containerType;
    });
  } catch (error) {
    mapUniqueNameError(error);
  }
}

export async function updateContainerType(
  containerTypeId: number,
  input: { name: string },
) {
  validateId(containerTypeId, "Container type");
  const name = normalizeName(input.name);
  try {
    return await prisma.$transaction(async (transaction) => {
      const existing = await transaction.containerType.findUnique({
        where: { id: containerTypeId },
      });
      if (!existing) throw new ReferenceDataNotFoundError("Container type");
      const containerType = await transaction.containerType.update({
        where: { id: containerTypeId },
        data: { name },
      });
      await recordEvent(
        {
          eventType: "containerType.edited",
          entityType: "containerType",
          entityId: containerType.id,
          summary: `Edited container type ${containerType.name}.`,
          metadata: {
            containerTypeName: containerType.name,
            previousContainerTypeName: existing.name,
          },
        },
        transaction,
      );
      return containerType;
    });
  } catch (error) {
    if (error instanceof ReferenceDataNotFoundError) throw error;
    mapUniqueNameError(error);
  }
}

export async function evaluateContainerTypeDeletion(containerTypeId: number) {
  validateId(containerTypeId, "Container type");
  const containerType = await prisma.containerType.findUnique({
    where: { id: containerTypeId },
    select: { id: true, _count: { select: { containers: true } } },
  });
  if (!containerType) throw new ReferenceDataNotFoundError("Container type");
  return {
    canDelete: containerType._count.containers === 0,
    containerCount: containerType._count.containers,
  };
}

export async function deleteContainerType(containerTypeId: number) {
  validateId(containerTypeId, "Container type");
  return prisma.$transaction(async (transaction) => {
    const containerType = await transaction.containerType.findUnique({
      where: { id: containerTypeId },
      select: { id: true, name: true, _count: { select: { containers: true } } },
    });
    if (!containerType) throw new ReferenceDataNotFoundError("Container type");
    if (containerType._count.containers > 0) {
      throw new ReferenceDataDeletionBlockedError(
        `This container type is used by ${containerType._count.containers} ${containerType._count.containers === 1 ? "container" : "containers"}.`,
        containerType._count.containers,
      );
    }
    await transaction.containerType.delete({ where: { id: containerType.id } });
    await recordEvent(
      {
        eventType: "containerType.deleted",
        entityType: "containerType",
        entityId: containerType.id,
        summary: `Deleted container type ${containerType.name}.`,
        metadata: { containerTypeName: containerType.name },
      },
      transaction,
    );
  });
}

export async function listCategories() {
  return prisma.category.findMany({
    include: { _count: { select: { inventoryItems: true } } },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}

export async function getCategory(categoryId: number) {
  if (!Number.isInteger(categoryId) || categoryId <= 0) return null;
  return prisma.category.findUnique({ where: { id: categoryId } });
}

export async function createCategory(input: { name: string }) {
  const name = normalizeName(input.name);
  try {
    return await prisma.$transaction(async (transaction) => {
      const category = await transaction.category.create({ data: { name } });
      await recordEvent(
        {
          eventType: "category.created",
          entityType: "category",
          entityId: category.id,
          summary: `Created category ${category.name}.`,
          metadata: { categoryName: category.name },
        },
        transaction,
      );
      return category;
    });
  } catch (error) {
    mapUniqueNameError(error);
  }
}

export async function updateCategory(categoryId: number, input: { name: string }) {
  validateId(categoryId, "Category");
  const name = normalizeName(input.name);
  try {
    return await prisma.$transaction(async (transaction) => {
      const existing = await transaction.category.findUnique({
        where: { id: categoryId },
      });
      if (!existing) throw new ReferenceDataNotFoundError("Category");
      const category = await transaction.category.update({
        where: { id: categoryId },
        data: { name },
      });
      await recordEvent(
        {
          eventType: "category.edited",
          entityType: "category",
          entityId: category.id,
          summary: `Edited category ${category.name}.`,
          metadata: {
            categoryName: category.name,
            previousCategoryName: existing.name,
          },
        },
        transaction,
      );
      return category;
    });
  } catch (error) {
    if (error instanceof ReferenceDataNotFoundError) throw error;
    mapUniqueNameError(error);
  }
}

export async function evaluateCategoryDeletion(categoryId: number) {
  validateId(categoryId, "Category");
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, _count: { select: { inventoryItems: true } } },
  });
  if (!category) throw new ReferenceDataNotFoundError("Category");
  return {
    canDelete: category._count.inventoryItems === 0,
    inventoryCount: category._count.inventoryItems,
  };
}

export async function deleteCategory(categoryId: number) {
  validateId(categoryId, "Category");
  return prisma.$transaction(async (transaction) => {
    const category = await transaction.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        _count: { select: { inventoryItems: true } },
      },
    });
    if (!category) throw new ReferenceDataNotFoundError("Category");
    if (category._count.inventoryItems > 0) {
      throw new ReferenceDataDeletionBlockedError(
        `This category is used by ${category._count.inventoryItems} inventory ${category._count.inventoryItems === 1 ? "record" : "records"}.`,
        category._count.inventoryItems,
      );
    }
    await transaction.category.delete({ where: { id: category.id } });
    await recordEvent(
      {
        eventType: "category.deleted",
        entityType: "category",
        entityId: category.id,
        summary: `Deleted category ${category.name}.`,
        metadata: { categoryName: category.name },
      },
      transaction,
    );
  });
}
