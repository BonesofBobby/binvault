/*
  Warnings:

  - You are about to drop the `Item` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Item";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "inventoryType" TEXT NOT NULL DEFAULT 'STANDARD_ITEM',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "condition" TEXT,
    "notes" TEXT,
    "manufacturer" TEXT,
    "modelNumber" TEXT,
    "serialNumber" TEXT,
    "purchaseDate" DATETIME,
    "purchasePrice" REAL,
    "warrantyEnd" DATETIME,
    "partNumber" TEXT,
    "replacementIntervalDays" INTEGER,
    "minimumQuantity" INTEGER,
    "documentType" TEXT,
    "expirationDate" DATETIME,
    "containerId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryItem_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Container" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "binNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PARTIAL',
    "locationId" INTEGER,
    "containerTypeId" INTEGER,
    "lastOpenedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Container_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Container_containerTypeId_fkey" FOREIGN KEY ("containerTypeId") REFERENCES "ContainerType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Container" ("binNumber", "containerTypeId", "createdAt", "description", "id", "locationId", "name", "notes", "updatedAt") SELECT "binNumber", "containerTypeId", "createdAt", "description", "id", "locationId", "name", "notes", "updatedAt" FROM "Container";
DROP TABLE "Container";
ALTER TABLE "new_Container" RENAME TO "Container";
CREATE UNIQUE INDEX "Container_binNumber_key" ON "Container"("binNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
