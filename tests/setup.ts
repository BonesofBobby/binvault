import {
  afterAll,
  afterEach,
  beforeEach,
  vi,
} from "vitest";

import { prisma } from "@/lib/db/prisma";

const databasePath =
  process.env.BINVAULT_TEST_DATABASE_PATH ?? "";

if (!databasePath.includes("binvault-vitest-")) {
  throw new Error(
    "Refusing to run tests without an isolated BinVault temporary database.",
  );
}

beforeEach(async () => {
  await prisma.$transaction([
    prisma.media.deleteMany(),
    prisma.inventoryItem.deleteMany(),
    prisma.container.deleteMany(),
    prisma.category.deleteMany(),
    prisma.containerType.deleteMany(),
    prisma.location.deleteMany(),
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await prisma.$disconnect();
});
