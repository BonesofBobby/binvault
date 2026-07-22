import { InventoryType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { DashboardSummary } from "@/lib/types/dashboard";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [
    locationCount,
    containerCount,
    inventoryItemCount,
    assetCount,
    consumableCount,
    documentCount,
    mediaCount,
    categoryCount,
  ] = await prisma.$transaction([
    prisma.location.count(),
    prisma.container.count(),
    prisma.inventoryItem.count(),
    prisma.inventoryItem.count({
      where: {
        inventoryType: InventoryType.ASSET,
      },
    }),
    prisma.inventoryItem.count({
      where: {
        inventoryType: InventoryType.CONSUMABLE,
      },
    }),
    prisma.inventoryItem.count({
      where: {
        inventoryType: InventoryType.DOCUMENT,
      },
    }),
    prisma.media.count(),
    prisma.category.count(),
  ]);

  return {
    locationCount,
    containerCount,
    inventoryItemCount,
    assetCount,
    consumableCount,
    documentCount,
    mediaCount,
    categoryCount,
  };
}