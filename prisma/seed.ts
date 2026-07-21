import { PrismaClient, InventoryType, ContainerStatus } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.inventoryItem.deleteMany();
  await prisma.container.deleteMany();
  await prisma.category.deleteMany();
  await prisma.containerType.deleteMany();
  await prisma.location.deleteMany();

  const home = await prisma.location.create({
    data: { name: "Home" },
  });

  const garage = await prisma.location.create({
    data: { name: "Garage", parentId: home.id },
  });

  const attic = await prisma.location.create({
    data: { name: "Attic", parentId: home.id },
  });

  const office = await prisma.location.create({
    data: { name: "Office", parentId: home.id },
  });

  const kitchen = await prisma.location.create({
    data: { name: "Kitchen", parentId: home.id },
  });

  await prisma.location.create({
    data: { name: "Laundry Room", parentId: home.id },
  });

  const plasticTote = await prisma.containerType.create({
    data: { name: "Plastic Tote" },
  });

  const storageBin = await prisma.containerType.create({
    data: { name: "Storage Bin" },
  });

  const cabinet = await prisma.containerType.create({
    data: { name: "Cabinet" },
  });

  const safe = await prisma.containerType.create({
    data: { name: "Safe" },
  });

  const electronics = await prisma.category.create({
    data: { name: "Electronics" },
  });

  const tools = await prisma.category.create({
    data: { name: "Tools" },
  });

  const holiday = await prisma.category.create({
    data: { name: "Holiday" },
  });

  const documents = await prisma.category.create({
    data: { name: "Documents" },
  });

  const maintenance = await prisma.category.create({
    data: { name: "Maintenance" },
  });

  const garageElectrical = await prisma.container.create({
    data: {
      binNumber: "BIN-GARAGE-001",
      name: "Electrical Supplies",
      description: "Cables, cords, adapters, and small electrical accessories.",
      notes: "Stored on the main garage shelf.",
      status: ContainerStatus.COMPLETE,
      locationId: garage.id,
      containerTypeId: plasticTote.id,
    },
  });

  const holidayDecor = await prisma.container.create({
    data: {
      binNumber: "BIN-HOLIDAY-001",
      name: "Christmas Decorations",
      description: "Holiday lights, ornaments, and seasonal decorations.",
      status: ContainerStatus.PARTIAL,
      locationId: attic.id,
      containerTypeId: storageBin.id,
    },
  });

  const officeTech = await prisma.container.create({
    data: {
      binNumber: "BIN-OFFICE-001",
      name: "Computer Equipment",
      description: "Spare computer parts and accessories.",
      status: ContainerStatus.COMPLETE,
      locationId: office.id,
      containerTypeId: plasticTote.id,
    },
  });

  const kitchenAppliances = await prisma.container.create({
    data: {
      binNumber: "BIN-KITCHEN-001",
      name: "Small Appliances",
      description: "Kitchen appliances stored when not in regular use.",
      status: ContainerStatus.PARTIAL,
      locationId: kitchen.id,
      containerTypeId: cabinet.id,
    },
  });

  const documentSafe = await prisma.container.create({
    data: {
      binNumber: "SAFE-DOC-001",
      name: "Important Documents",
      description: "Personal and household records.",
      status: ContainerStatus.COMPLETE,
      locationId: office.id,
      containerTypeId: safe.id,
    },
  });

  await prisma.inventoryItem.createMany({
    data: [
      {
        containerId: garageElectrical.id,
        name: "HDMI Cable",
        quantity: 4,
        inventoryType: InventoryType.STANDARD_ITEM,
        condition: "Good",
        categoryId: electronics.id,
      },
      {
        containerId: garageElectrical.id,
        name: "Ethernet Cable",
        quantity: 8,
        inventoryType: InventoryType.STANDARD_ITEM,
        condition: "Good",
        categoryId: electronics.id,
      },
      {
        containerId: garageElectrical.id,
        name: "Extension Cord",
        quantity: 3,
        inventoryType: InventoryType.STANDARD_ITEM,
        condition: "Good",
        categoryId: tools.id,
      },
      {
        containerId: holidayDecor.id,
        name: "Christmas Lights",
        quantity: 6,
        inventoryType: InventoryType.STANDARD_ITEM,
        condition: "Good",
        categoryId: holiday.id,
      },
      {
        containerId: holidayDecor.id,
        name: "Tree Ornaments",
        quantity: 40,
        inventoryType: InventoryType.STANDARD_ITEM,
        condition: "Good",
        categoryId: holiday.id,
      },
      {
        containerId: officeTech.id,
        name: "Dell Laptop",
        quantity: 1,
        inventoryType: InventoryType.ASSET,
        condition: "Good",
        manufacturer: "Dell",
        modelNumber: "Latitude Series",
        serialNumber: "DL-DEMO-001",
        purchasePrice: 850,
        categoryId: electronics.id,
      },
      {
        containerId: officeTech.id,
        name: "USB-C Charger",
        quantity: 2,
        inventoryType: InventoryType.STANDARD_ITEM,
        condition: "Good",
        categoryId: electronics.id,
      },
      {
        containerId: kitchenAppliances.id,
        name: "Air Fryer",
        quantity: 1,
        inventoryType: InventoryType.ASSET,
        condition: "Excellent",
        manufacturer: "Ninja",
        modelNumber: "AF-DEMO",
        purchasePrice: 129.99,
        categoryId: electronics.id,
      },
      {
        containerId: documentSafe.id,
        name: "Birth Certificate",
        quantity: 1,
        inventoryType: InventoryType.DOCUMENT,
        condition: "Original",
        documentType: "Vital Record",
        categoryId: documents.id,
      },
      {
        containerId: documentSafe.id,
        name: "Home Insurance Policy",
        quantity: 1,
        inventoryType: InventoryType.DOCUMENT,
        condition: "Current",
        documentType: "Insurance",
        categoryId: documents.id,
      },
      {
        containerId: kitchenAppliances.id,
        name: "Refrigerator Water Filter",
        quantity: 2,
        inventoryType: InventoryType.CONSUMABLE,
        condition: "New",
        partNumber: "FILTER-DEMO-001",
        replacementIntervalDays: 180,
        minimumQuantity: 1,
        categoryId: maintenance.id,
      },
      {
        containerId: garageElectrical.id,
        name: "AA Batteries",
        quantity: 24,
        inventoryType: InventoryType.CONSUMABLE,
        condition: "New",
        minimumQuantity: 8,
        categoryId: maintenance.id,
      },
    ],
  });

  console.log("Seed data created successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });