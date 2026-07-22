import { prisma } from "@/lib/db/prisma";
import type {
  DashboardCategoryInsight,
  DashboardContainerInsight,
  DashboardInsights,
  DashboardItemInsight,
} from "@/lib/types/dashboard";

function mapItemInsight(item: {
  id: number;
  name: string;
  inventoryType: DashboardItemInsight["inventoryType"];
  container: {
    id: number;
    name: string;
    binNumber: string;
  };
  createdAt: Date;
  updatedAt: Date;
}): DashboardItemInsight {
  return {
    id: item.id,
    name: item.name,
    inventoryType: item.inventoryType,
    containerId: item.container.id,
    containerName: item.container.name,
    containerBinNumber: item.container.binNumber,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function getDashboardInsights(): Promise<DashboardInsights> {
  const [
    categories,
    containers,
    newestItem,
    oldestItem,
    itemsWithoutPhotosCount,
  ] = await Promise.all([
    prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        inventoryItems: {
          select: {
            quantity: true,
          },
        },
      },
    }),

    prisma.container.findMany({
      orderBy: {
        binNumber: "asc",
      },
      include: {
        inventoryItems: {
          select: {
            quantity: true,
          },
        },
      },
    }),

    prisma.inventoryItem.findFirst({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        container: {
          select: {
            id: true,
            name: true,
            binNumber: true,
          },
        },
      },
    }),

    prisma.inventoryItem.findFirst({
      orderBy: {
        createdAt: "asc",
      },
      include: {
        container: {
          select: {
            id: true,
            name: true,
            binNumber: true,
          },
        },
      },
    }),

    prisma.inventoryItem.count({
      where: {
        media: {
          none: {},
        },
      },
    }),
  ]);

  const categoryInsights: DashboardCategoryInsight[] = categories.map(
    (category) => ({
      id: category.id,
      name: category.name,
      inventoryItemCount: category.inventoryItems.length,
      totalQuantity: category.inventoryItems.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
    }),
  );

  const containerInsights: DashboardContainerInsight[] = containers.map(
    (container) => ({
      id: container.id,
      name: container.name,
      binNumber: container.binNumber,
      inventoryItemCount: container.inventoryItems.length,
      totalQuantity: container.inventoryItems.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
    }),
  );

  const mostUsedCategory =
    categoryInsights.reduce<DashboardCategoryInsight | null>(
      (currentMostUsed, category) => {
        if (!currentMostUsed) {
          return category;
        }

        if (category.inventoryItemCount > currentMostUsed.inventoryItemCount) {
          return category;
        }

        if (
          category.inventoryItemCount ===
            currentMostUsed.inventoryItemCount &&
          category.totalQuantity > currentMostUsed.totalQuantity
        ) {
          return category;
        }

        return currentMostUsed;
      },
      null,
    );

  const largestContainer =
    containerInsights.reduce<DashboardContainerInsight | null>(
      (currentLargest, container) => {
        if (!currentLargest) {
          return container;
        }

        if (container.totalQuantity > currentLargest.totalQuantity) {
          return container;
        }

        if (
          container.totalQuantity === currentLargest.totalQuantity &&
          container.inventoryItemCount > currentLargest.inventoryItemCount
        ) {
          return container;
        }

        return currentLargest;
      },
      null,
    );

  return {
    mostUsedCategory,
    largestContainer,
    newestItem: newestItem ? mapItemInsight(newestItem) : null,
    oldestItem: oldestItem ? mapItemInsight(oldestItem) : null,
    itemsWithoutPhotosCount,
  };
}