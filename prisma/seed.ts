import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const garage = await prisma.location.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "Garage" },
  });

  const shelfA = await prisma.location.create({
    data: {
      name: "Garage Shelf A",
      parentId: garage.id,
    },
  });

  const tote = await prisma.containerType.upsert({
    where: { name: "Plastic Tote" },
    update: {},
    create: { name: "Plastic Tote" },
  });

  const electronics = await prisma.category.upsert({
    where: { name: "Electronics" },
    update: {},
    create: { name: "Electronics" },
  });

  const tools = await prisma.category.upsert({
    where: { name: "Tools" },
    update: {},
    create: { name: "Tools" },
  });

  const container = await prisma.container.upsert({
    where: { binNumber: "BIN-GARAGE-001" },
    update: {},
    create: {
      binNumber: "BIN-GARAGE-001",
      name: "Electrical Supplies Tote",
      description: "Clear tote with cables and electrical supplies.",
      notes: "Stored on Garage Shelf A.",
      locationId: shelfA.id,
      containerTypeId: tote.id,
    },
  });

  await prisma.item.createMany({
    data: [
      {
        containerId: container.id,
        name: "HDMI Cable",
        quantity: 4,
        categoryId: electronics.id,
        condition: "Good",
        notes: "Various lengths.",
      },
      {
        containerId: container.id,
        name: "Ethernet Cable",
        quantity: 8,
        categoryId: electronics.id,
        condition: "Good",
      },
      {
        containerId: container.id,
        name: "Extension Cord",
        quantity: 3,
        categoryId: tools.id,
        condition: "Good",
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed data created successfully.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });