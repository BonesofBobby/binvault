-- CreateTable
CREATE TABLE "Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Event_createdAt_id_idx" ON "Event"("createdAt", "id");

-- CreateIndex
CREATE INDEX "Event_entityType_entityId_createdAt_id_idx" ON "Event"("entityType", "entityId", "createdAt", "id");
