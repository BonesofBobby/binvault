import {
  ContainerStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { recordEvent } from "@/lib/services/event-service";

export type ContainerField =
  | "binNumber"
  | "name"
  | "description"
  | "notes"
  | "locationId"
  | "containerTypeId"
  | "status";

export type ContainerFieldErrors = Partial<
  Record<ContainerField, string>
>;

export type ContainerManagementInput = {
  binNumber: string;
  name: string;
  description?: string | null;
  notes?: string | null;
  locationId: number | null;
  containerTypeId: number | null;
  status: string;
};

export class ContainerValidationError extends Error {
  constructor(
    message: string,
    readonly fieldErrors: ContainerFieldErrors,
  ) {
    super(message);
    this.name = "ContainerValidationError";
  }
}

export class ContainerNotFoundError extends Error {
  constructor() {
    super("Container not found.");
    this.name = "ContainerNotFoundError";
  }
}

export class ContainerDeletionBlockedError extends Error {
  constructor(readonly inventoryCount: number) {
    super(
      `This container cannot be deleted because it contains ${inventoryCount} inventory ${
        inventoryCount === 1 ? "record" : "records"
      }.`,
    );
    this.name = "ContainerDeletionBlockedError";
  }
}

function optionalString(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function isPositiveInteger(value: number | null): value is number {
  return value !== null && Number.isInteger(value) && value > 0;
}

async function validateContainerInput(
  input: ContainerManagementInput,
  existingContainerId?: number,
) {
  const fieldErrors: ContainerFieldErrors = {};
  const binNumber = input.binNumber.trim();
  const name = input.name.trim();

  if (!binNumber) {
    fieldErrors.binNumber = "An identifying label is required.";
  }

  if (!name) {
    fieldErrors.name = "A container name is required.";
  }

  if (!isPositiveInteger(input.locationId)) {
    fieldErrors.locationId = "Select a valid location.";
  }

  if (!isPositiveInteger(input.containerTypeId)) {
    fieldErrors.containerTypeId = "Select a valid container type.";
  }

  if (
    !Object.values(ContainerStatus).includes(
      input.status as ContainerStatus,
    )
  ) {
    fieldErrors.status = "Select a valid container status.";
  }

  const [duplicate, location, containerType] =
    await Promise.all([
      binNumber
        ? prisma.container.findFirst({
            where: {
              binNumber,
              id: existingContainerId
                ? {
                    not: existingContainerId,
                  }
                : undefined,
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
      isPositiveInteger(input.locationId)
        ? prisma.location.findUnique({
            where: {
              id: input.locationId,
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
      isPositiveInteger(input.containerTypeId)
        ? prisma.containerType.findUnique({
            where: {
              id: input.containerTypeId,
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
    ]);

  if (duplicate) {
    fieldErrors.binNumber =
      "That identifying label is already in use.";
  }

  if (isPositiveInteger(input.locationId) && !location) {
    fieldErrors.locationId =
      "The selected location is no longer available.";
  }

  if (
    isPositiveInteger(input.containerTypeId) &&
    !containerType
  ) {
    fieldErrors.containerTypeId =
      "The selected container type is no longer available.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ContainerValidationError(
      "Review the highlighted container information.",
      fieldErrors,
    );
  }

  return {
    binNumber,
    name,
    description: optionalString(input.description),
    notes: optionalString(input.notes),
    locationId: input.locationId as number,
    containerTypeId: input.containerTypeId as number,
    status: input.status as ContainerStatus,
  };
}

function mapPrismaWriteError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new ContainerValidationError(
      "Review the highlighted container information.",
      {
        binNumber:
          "That identifying label is already in use.",
      },
    );
  }

  throw error;
}

export async function listContainers() {
  return prisma.container.findMany({
    include: {
      location: true,
      containerType: true,
      _count: {
        select: {
          inventoryItems: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function getContainer(containerId: number) {
  if (!Number.isInteger(containerId) || containerId <= 0) {
    return null;
  }

  return prisma.container.findUnique({
    where: {
      id: containerId,
    },
    include: {
      location: true,
      containerType: true,
      inventoryItems: {
        include: {
          category: true,
        },
        orderBy: {
          name: "asc",
        },
      },
    },
  });
}

export async function getContainerFormOptions() {
  const [locations, containerTypes] = await Promise.all([
    prisma.location.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        parent: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.containerType.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  return {
    locations,
    containerTypes,
  };
}

export async function createContainer(
  input: ContainerManagementInput,
) {
  const data = await validateContainerInput(input);

  try {
    return await prisma.$transaction(async (transaction) => {
      const container = await transaction.container.create({ data });
      await recordEvent(
        {
          eventType: "container.created",
          entityType: "container",
          entityId: container.id,
          summary: `Created container ${container.name}.`,
          metadata: {
            containerName: container.name,
            binNumber: container.binNumber,
            locationId: container.locationId,
            containerTypeId: container.containerTypeId,
            status: container.status,
          },
        },
        transaction,
      );
      return container;
    });
  } catch (error) {
    mapPrismaWriteError(error);
  }
}

export async function updateContainer(
  containerId: number,
  input: ContainerManagementInput,
) {
  const existing = await prisma.container.findUnique({
    where: {
      id: containerId,
    },
    select: {
      id: true,
      name: true,
      binNumber: true,
    },
  });

  if (!existing) {
    throw new ContainerNotFoundError();
  }

  const data = await validateContainerInput(
    input,
    containerId,
  );

  try {
    return await prisma.$transaction(async (transaction) => {
      const container = await transaction.container.update({
        where: { id: containerId },
        data,
      });
      await recordEvent(
        {
          eventType: "container.edited",
          entityType: "container",
          entityId: container.id,
          summary: `Edited container ${container.name}.`,
          metadata: {
            containerName: container.name,
            previousContainerName: existing.name,
            binNumber: container.binNumber,
            previousBinNumber: existing.binNumber,
            locationId: container.locationId,
            containerTypeId: container.containerTypeId,
            status: container.status,
          },
        },
        transaction,
      );
      return container;
    });
  } catch (error) {
    mapPrismaWriteError(error);
  }
}

export async function evaluateContainerDeletion(
  containerId: number,
) {
  const container = await prisma.container.findUnique({
    where: {
      id: containerId,
    },
    select: {
      id: true,
      _count: {
        select: {
          inventoryItems: true,
        },
      },
    },
  });

  if (!container) {
    throw new ContainerNotFoundError();
  }

  return {
    canDelete: container._count.inventoryItems === 0,
    inventoryCount: container._count.inventoryItems,
  };
}

export async function deleteContainer(containerId: number) {
  try {
    return await prisma.$transaction(async (transaction) => {
      const container = await transaction.container.findUnique({
        where: {
          id: containerId,
        },
        select: {
          id: true,
          name: true,
          binNumber: true,
          location: { select: { id: true, name: true } },
          containerType: { select: { id: true, name: true } },
          status: true,
          _count: {
            select: {
              inventoryItems: true,
            },
          },
        },
      });

      if (!container) {
        throw new ContainerNotFoundError();
      }

      if (container._count.inventoryItems > 0) {
        throw new ContainerDeletionBlockedError(
          container._count.inventoryItems,
        );
      }

      const deleted = await transaction.container.delete({
        where: {
          id: container.id,
        },
      });
      await recordEvent(
        {
          eventType: "container.deleted",
          entityType: "container",
          entityId: container.id,
          summary: `Deleted container ${container.name}.`,
          metadata: {
            containerName: container.name,
            binNumber: container.binNumber,
            formerLocationId: container.location?.id ?? null,
            formerLocationName: container.location?.name ?? null,
            containerTypeId: container.containerType?.id ?? null,
            containerTypeName: container.containerType?.name ?? null,
            status: container.status,
            inventoryCount: container._count.inventoryItems,
          },
        },
        transaction,
      );
      return deleted;
    });
  } catch (error) {
    if (
      error instanceof ContainerNotFoundError ||
      error instanceof ContainerDeletionBlockedError
    ) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new ContainerNotFoundError();
    }

    throw error;
  }
}
