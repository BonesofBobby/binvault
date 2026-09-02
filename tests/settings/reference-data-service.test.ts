import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { createContainer, getContainerFormOptions } from "@/lib/services/container-service";
import {
  ReferenceDataDeletionBlockedError,
  ReferenceDataValidationError,
  createCategory,
  createContainerType,
  createLocation,
  deleteCategory,
  deleteContainerType,
  deleteLocation,
  evaluateCategoryDeletion,
  evaluateContainerTypeDeletion,
  evaluateLocationDeletion,
  listCategories,
  listContainerTypes,
  listLocations,
  updateCategory,
  updateContainerType,
  updateLocation,
} from "@/lib/services/reference-data-service";

async function createContainerFixture() {
  const location = await createLocation({ name: "Garage", parentId: null });
  const containerType = await createContainerType({ name: "Plastic Tote" });
  const container = await createContainer({
    binNumber: "BIN-001",
    name: "Test Container",
    description: null,
    notes: null,
    locationId: location.id,
    containerTypeId: containerType.id,
    status: "EMPTY",
  });
  return { location, containerType, container };
}

describe("location reference data", () => {
  it("lists an empty fresh database", async () => {
    await expect(listLocations()).resolves.toEqual([]);
  });

  it("creates a trimmed location and records an event", async () => {
    const location = await createLocation({ name: "  Home  ", parentId: null });
    expect(location.name).toBe("Home");
    await expect(prisma.event.findFirst({ where: { eventType: "location.created" } })).resolves.toMatchObject({
      entityType: "location",
      entityId: String(location.id),
      summary: "Created location Home.",
    });
  });

  it("rejects empty and overly long names", async () => {
    await expect(createLocation({ name: "   ", parentId: null })).rejects.toBeInstanceOf(ReferenceDataValidationError);
    await expect(createLocation({ name: "x".repeat(101), parentId: null })).rejects.toMatchObject({
      fieldErrors: { name: "Use 100 characters or fewer." },
    });
  });

  it("rejects duplicate names at the same hierarchy level", async () => {
    await createLocation({ name: "Home", parentId: null });
    await expect(createLocation({ name: "Home", parentId: null })).rejects.toMatchObject({
      fieldErrors: { name: "A location with that name already exists at this level." },
    });
    expect(await prisma.event.count({ where: { eventType: "location.created" } })).toBe(1);
  });

  it("allows the same location name beneath different parents", async () => {
    const home = await createLocation({ name: "Home", parentId: null });
    const workshop = await createLocation({ name: "Workshop", parentId: null });
    await createLocation({ name: "Cabinet", parentId: home.id });
    await expect(createLocation({ name: "Cabinet", parentId: workshop.id })).resolves.toMatchObject({
      name: "Cabinet",
      parentId: workshop.id,
    });
  });

  it("updates a location and records the previous name", async () => {
    const location = await createLocation({ name: "Cellar", parentId: null });
    const updated = await updateLocation(location.id, { name: "Basement", parentId: null });
    expect(updated.name).toBe("Basement");
    await expect(prisma.event.findFirst({ where: { eventType: "location.edited" } })).resolves.toMatchObject({
      metadata: expect.objectContaining({ previousLocationName: "Cellar" }),
    });
  });

  it("assigns an optional parent and returns hierarchy order", async () => {
    const home = await createLocation({ name: "Home", parentId: null });
    const garage = await createLocation({ name: "Garage", parentId: home.id });
    const locations = await listLocations();
    expect(locations.map(({ id, depth }) => ({ id, depth }))).toEqual([
      { id: home.id, depth: 0 },
      { id: garage.id, depth: 1 },
    ]);
  });

  it("removes a parent by setting it to null", async () => {
    const home = await createLocation({ name: "Home", parentId: null });
    const garage = await createLocation({ name: "Garage", parentId: home.id });
    await expect(updateLocation(garage.id, { name: "Garage", parentId: null })).resolves.toMatchObject({
      parentId: null,
    });
  });

  it("rejects self-parenting", async () => {
    const location = await createLocation({ name: "Home", parentId: null });
    await expect(updateLocation(location.id, { name: "Home", parentId: location.id })).rejects.toMatchObject({
      fieldErrors: { parentId: "A location cannot be its own parent." },
    });
    expect(await prisma.event.count({ where: { eventType: "location.edited" } })).toBe(0);
  });

  it("rejects cycles and descendant parents", async () => {
    const home = await createLocation({ name: "Home", parentId: null });
    const garage = await createLocation({ name: "Garage", parentId: home.id });
    const shelf = await createLocation({ name: "Shelf", parentId: garage.id });
    await expect(updateLocation(home.id, { name: "Home", parentId: shelf.id })).rejects.toMatchObject({
      fieldErrors: { parentId: "A descendant cannot be selected as the parent." },
    });
    expect(await prisma.event.count({ where: { eventType: "location.edited" } })).toBe(0);
  });

  it("rejects an invalid or missing parent", async () => {
    await expect(createLocation({ name: "Garage", parentId: -1 })).rejects.toMatchObject({
      fieldErrors: { parentId: "Select a valid parent location." },
    });
    await expect(createLocation({ name: "Garage", parentId: 9999 })).rejects.toMatchObject({
      fieldErrors: { parentId: "The selected parent location no longer exists." },
    });
  });

  it("blocks deletion while a container uses the location", async () => {
    const { location } = await createContainerFixture();
    await expect(evaluateLocationDeletion(location.id)).resolves.toEqual({
      canDelete: false,
      childCount: 0,
      containerCount: 1,
    });
    await expect(deleteLocation(location.id)).rejects.toBeInstanceOf(ReferenceDataDeletionBlockedError);
    expect(await prisma.event.count({ where: { eventType: "location.deleted" } })).toBe(0);
  });

  it("blocks deletion while child locations exist", async () => {
    const parent = await createLocation({ name: "Home", parentId: null });
    await createLocation({ name: "Garage", parentId: parent.id });
    await expect(deleteLocation(parent.id)).rejects.toMatchObject({ usageCount: 1 });
    expect(await prisma.location.count()).toBe(2);
  });

  it("deletes an unused location and records the event", async () => {
    const location = await createLocation({ name: "Attic", parentId: null });
    await expect(deleteLocation(location.id)).resolves.toBeUndefined();
    expect(await prisma.location.count()).toBe(0);
    expect(await prisma.event.count({ where: { eventType: "location.deleted" } })).toBe(1);
  });

  it("rolls back the location mutation when the event write fails", async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER fail_location_event
      BEFORE INSERT ON Event
      WHEN NEW.eventType = 'location.created'
      BEGIN
        SELECT RAISE(ABORT, 'forced event failure');
      END;
    `);
    try {
      await expect(createLocation({ name: "Rollback Test", parentId: null })).rejects.toThrow();
      expect(await prisma.location.count({ where: { name: "Rollback Test" } })).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS fail_location_event");
    }
  });
});

describe("container type reference data", () => {
  it("creates and lists a trimmed container type", async () => {
    const created = await createContainerType({ name: "  Cabinet " });
    expect(created.name).toBe("Cabinet");
    await expect(listContainerTypes()).resolves.toHaveLength(1);
  });

  it("validates and rejects duplicate names", async () => {
    await expect(createContainerType({ name: " " })).rejects.toBeInstanceOf(ReferenceDataValidationError);
    await createContainerType({ name: "Tote" });
    await expect(createContainerType({ name: "Tote" })).rejects.toMatchObject({
      fieldErrors: { name: "That name is already in use." },
    });
  });

  it("updates a container type and records an event", async () => {
    const type = await createContainerType({ name: "Bin" });
    await expect(updateContainerType(type.id, { name: "Storage Bin" })).resolves.toMatchObject({ name: "Storage Bin" });
    expect(await prisma.event.count({ where: { eventType: "containerType.edited" } })).toBe(1);
  });

  it("blocks deletion when a container uses the type without a success event", async () => {
    const { containerType } = await createContainerFixture();
    await expect(evaluateContainerTypeDeletion(containerType.id)).resolves.toEqual({ canDelete: false, containerCount: 1 });
    await expect(deleteContainerType(containerType.id)).rejects.toBeInstanceOf(ReferenceDataDeletionBlockedError);
    expect(await prisma.event.count({ where: { eventType: "containerType.deleted" } })).toBe(0);
  });

  it("deletes an unused type and records an event", async () => {
    const type = await createContainerType({ name: "Safe" });
    await deleteContainerType(type.id);
    expect(await prisma.containerType.count()).toBe(0);
    expect(await prisma.event.count({ where: { eventType: "containerType.deleted" } })).toBe(1);
  });
});

describe("category reference data", () => {
  it("creates and lists a trimmed category", async () => {
    const created = await createCategory({ name: "  Tools " });
    expect(created.name).toBe("Tools");
    await expect(listCategories()).resolves.toHaveLength(1);
  });

  it("validates and rejects duplicate names", async () => {
    await expect(createCategory({ name: "" })).rejects.toBeInstanceOf(ReferenceDataValidationError);
    await createCategory({ name: "Documents" });
    await expect(createCategory({ name: "Documents" })).rejects.toMatchObject({
      fieldErrors: { name: "That name is already in use." },
    });
  });

  it("updates a category and records an event", async () => {
    const category = await createCategory({ name: "Tech" });
    await expect(updateCategory(category.id, { name: "Electronics" })).resolves.toMatchObject({ name: "Electronics" });
    expect(await prisma.event.count({ where: { eventType: "category.edited" } })).toBe(1);
  });

  it("blocks deletion while inventory uses the category", async () => {
    const { container } = await createContainerFixture();
    const category = await createCategory({ name: "Tools" });
    await prisma.inventoryItem.create({
      data: { name: "Drill", containerId: container.id, categoryId: category.id },
    });
    await expect(evaluateCategoryDeletion(category.id)).resolves.toEqual({ canDelete: false, inventoryCount: 1 });
    await expect(deleteCategory(category.id)).rejects.toBeInstanceOf(ReferenceDataDeletionBlockedError);
    expect(await prisma.event.count({ where: { eventType: "category.deleted" } })).toBe(0);
  });

  it("deletes an unused category and records an event", async () => {
    const category = await createCategory({ name: "Holiday" });
    await deleteCategory(category.id);
    expect(await prisma.category.count()).toBe(0);
    expect(await prisma.event.count({ where: { eventType: "category.deleted" } })).toBe(1);
  });
});

describe("fresh database first-run flow", () => {
  it("creates container prerequisites and a first container without seed data", async () => {
    await expect(getContainerFormOptions()).resolves.toEqual({ locations: [], containerTypes: [] });
    await expect(listCategories()).resolves.toEqual([]);

    const location = await createLocation({ name: "Home", parentId: null });
    const containerType = await createContainerType({ name: "General" });
    const container = await createContainer({
      binNumber: "FIRST-001",
      name: "First Container",
      description: null,
      notes: null,
      locationId: location.id,
      containerTypeId: containerType.id,
      status: "EMPTY",
    });

    expect(container).toMatchObject({
      locationId: location.id,
      containerTypeId: containerType.id,
    });
    expect(await prisma.category.count()).toBe(0);
  });
});
