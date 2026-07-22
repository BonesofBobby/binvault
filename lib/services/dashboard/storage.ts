import { prisma } from "@/lib/db/prisma";
import type { DashboardStorageLocation } from "@/lib/types/dashboard";

export async function getDashboardStorage(): Promise<
  DashboardStorageLocation[]
> {
  const locations = await prisma.location.findMany({
    orderBy: [
      {
        parentId: "asc",
      },
      {
        name: "asc",
      },
    ],
    include: {
      parent: {
        select: {
          name: true,
        },
      },
      containers: {
        select: {
          inventoryItems: {
            select: {
              quantity: true,
            },
          },
        },
      },
    },
  });

  return locations.map((location) => {
    const inventoryItems = location.containers.flatMap(
      (container) => container.inventoryItems,
    );

    return {
      id: location.id,
      name: location.name,
      parentId: location.parentId,
      parentName: location.parent?.name ?? null,
      containerCount: location.containers.length,
      inventoryItemCount: inventoryItems.length,
      totalQuantity: inventoryItems.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
    };
  });
}