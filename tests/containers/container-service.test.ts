import {
  ContainerStatus,
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
  ContainerNotFoundError,
  ContainerValidationError,
  createContainer,
  deleteContainer,
  evaluateContainerDeletion,
  getContainer,
  getContainerFormOptions,
  listContainers,
  updateContainer,
  type ContainerManagementInput,
} from "@/lib/services/container-service";

async function createLookups() {
  const location = await prisma.location.create({
    data: {
      name: "Garage",
    },
  });
  const containerType = await prisma.containerType.create({
    data: {
      name: "Plastic Tote",
    },
  });

  return {
    location,
    containerType,
  };
}

function validInput(
  locationId: number,
  containerTypeId: number,
  overrides: Partial<ContainerManagementInput> = {},
): ContainerManagementInput {
  return {
    binNumber: "BIN-001",
    name: "Electrical Supplies",
    description: "Cables and adapters",
    notes: "Top shelf",
    locationId,
    containerTypeId,
    status: ContainerStatus.PARTIAL,
    ...overrides,
  };
}

describe("Container management service", () => {
  it("creates a valid container", async () => {
    const { location, containerType } =
      await createLookups();

    const container = await createContainer(
      validInput(location.id, containerType.id),
    );

    expect(container).toMatchObject({
      binNumber: "BIN-001",
      name: "Electrical Supplies",
      description: "Cables and adapters",
      notes: "Top shelf",
      locationId: location.id,
      containerTypeId: containerType.id,
      status: ContainerStatus.PARTIAL,
    });
  });

  it("rejects required fields that are missing", async () => {
    await expect(
      createContainer({
        binNumber: " ",
        name: "",
        description: null,
        notes: null,
        locationId: null,
        containerTypeId: null,
        status: "",
      }),
    ).rejects.toMatchObject({
      name: "ContainerValidationError",
      fieldErrors: {
        binNumber: "An identifying label is required.",
        name: "A container name is required.",
        locationId: "Select a valid location.",
        containerTypeId: "Select a valid container type.",
        status: "Select a valid container status.",
      },
    });
  });

  it("rejects a duplicate identifying label", async () => {
    const { location, containerType } =
      await createLookups();
    const input = validInput(
      location.id,
      containerType.id,
    );

    await createContainer(input);

    await expect(
      createContainer({
        ...input,
        name: "Another Container",
      }),
    ).rejects.toBeInstanceOf(ContainerValidationError);

    await expect(
      createContainer({
        ...input,
        name: "Another Container",
      }),
    ).rejects.toMatchObject({
      fieldErrors: {
        binNumber:
          "That identifying label is already in use.",
      },
    });
  });

  it("rejects an unavailable location", async () => {
    const { containerType } = await createLookups();

    await expect(
      createContainer(
        validInput(999_999, containerType.id),
      ),
    ).rejects.toMatchObject({
      fieldErrors: {
        locationId:
          "The selected location is no longer available.",
      },
    });
  });

  it("rejects an unavailable container type", async () => {
    const { location } = await createLookups();

    await expect(
      createContainer(validInput(location.id, 999_999)),
    ).rejects.toMatchObject({
      fieldErrors: {
        containerTypeId:
          "The selected container type is no longer available.",
      },
    });
  });

  it("updates a container", async () => {
    const { location, containerType } =
      await createLookups();
    const secondLocation = await prisma.location.create({
      data: {
        name: "Basement",
      },
    });
    const container = await createContainer(
      validInput(location.id, containerType.id),
    );

    const updated = await updateContainer(
      container.id,
      validInput(secondLocation.id, containerType.id, {
        binNumber: "BIN-UPDATED",
        name: "Updated Supplies",
        description: "Updated description",
        status: ContainerStatus.COMPLETE,
      }),
    );

    expect(updated).toMatchObject({
      id: container.id,
      binNumber: "BIN-UPDATED",
      name: "Updated Supplies",
      description: "Updated description",
      locationId: secondLocation.id,
      status: ContainerStatus.COMPLETE,
    });
  });

  it("preserves associated inventory during updates", async () => {
    const { location, containerType } =
      await createLookups();
    const container = await createContainer(
      validInput(location.id, containerType.id),
    );
    const inventory = await prisma.inventoryItem.create({
      data: {
        name: "Extension Cord",
        containerId: container.id,
        inventoryType: InventoryType.STANDARD_ITEM,
      },
    });

    await updateContainer(
      container.id,
      validInput(location.id, containerType.id, {
        name: "Renamed Container",
      }),
    );

    await expect(
      prisma.inventoryItem.findUnique({
        where: {
          id: inventory.id,
        },
      }),
    ).resolves.toMatchObject({
      id: inventory.id,
      containerId: container.id,
      name: "Extension Cord",
    });
  });

  it("deletes an empty container", async () => {
    const { location, containerType } =
      await createLookups();
    const container = await createContainer(
      validInput(location.id, containerType.id),
    );

    await expect(
      evaluateContainerDeletion(container.id),
    ).resolves.toEqual({
      canDelete: true,
      inventoryCount: 0,
    });

    await deleteContainer(container.id);

    await expect(getContainer(container.id)).resolves.toBeNull();
  });

  it("blocks deletion when inventory remains", async () => {
    const { location, containerType } =
      await createLookups();
    const container = await createContainer(
      validInput(location.id, containerType.id),
    );
    const inventory = await prisma.inventoryItem.create({
      data: {
        name: "Power Strip",
        containerId: container.id,
      },
    });
    const media = await prisma.media.create({
      data: {
        inventoryId: inventory.id,
        mediaType: MediaType.PHOTO,
        fileName: "power-strip.jpg",
        originalName: "power-strip.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1,
        storagePath: "tests/power-strip.jpg",
      },
    });

    await expect(
      evaluateContainerDeletion(container.id),
    ).resolves.toEqual({
      canDelete: false,
      inventoryCount: 1,
    });
    await expect(
      deleteContainer(container.id),
    ).rejects.toMatchObject({
      inventoryCount: 1,
    });

    await expect(getContainer(container.id)).resolves.not.toBeNull();
    await expect(
      prisma.inventoryItem.findUnique({
        where: {
          id: inventory.id,
        },
      }),
    ).resolves.not.toBeNull();
    await expect(
      prisma.media.findUnique({
        where: {
          id: media.id,
        },
      }),
    ).resolves.not.toBeNull();
  });

  it("reports missing containers consistently", async () => {
    const { location, containerType } =
      await createLookups();

    await expect(getContainer(999_999)).resolves.toBeNull();
    await expect(
      updateContainer(
        999_999,
        validInput(location.id, containerType.id),
      ),
    ).rejects.toBeInstanceOf(ContainerNotFoundError);
    await expect(
      evaluateContainerDeletion(999_999),
    ).rejects.toBeInstanceOf(ContainerNotFoundError);
    await expect(
      deleteContainer(999_999),
    ).rejects.toBeInstanceOf(ContainerNotFoundError);
  });

  it("integrates listing, detail, and form-option reads", async () => {
    const parent = await prisma.location.create({
      data: {
        name: "Home",
      },
    });
    const location = await prisma.location.create({
      data: {
        name: "Garage",
        parentId: parent.id,
      },
    });
    const containerType = await prisma.containerType.create({
      data: {
        name: "Cabinet",
      },
    });
    const container = await createContainer(
      validInput(location.id, containerType.id),
    );

    const [containers, detail, options] = await Promise.all([
      listContainers(),
      getContainer(container.id),
      getContainerFormOptions(),
    ]);

    expect(containers).toHaveLength(1);
    expect(containers[0]).toMatchObject({
      id: container.id,
      location: {
        id: location.id,
      },
      containerType: {
        id: containerType.id,
      },
      _count: {
        inventoryItems: 0,
      },
    });
    expect(detail).toMatchObject({
      id: container.id,
      inventoryItems: [],
    });
    expect(options.locations).toContainEqual({
      id: location.id,
      name: "Garage",
      parent: {
        name: "Home",
      },
    });
    expect(options.containerTypes).toContainEqual({
      id: containerType.id,
      name: "Cabinet",
    });
  });
});
