import { prisma } from "@/lib/db/prisma";
import { localFilesystemStorageProvider } from "@/lib/storage/local-filesystem-storage-provider";
import type { DashboardRecentItem } from "@/lib/types/dashboard";

const DEFAULT_RECENT_ITEM_LIMIT = 10;

export async function getDashboardRecentItems(
  limit: number = DEFAULT_RECENT_ITEM_LIMIT,
): Promise<DashboardRecentItem[]> {
  const normalizedLimit = Number.isInteger(limit) && limit > 0
    ? limit
    : DEFAULT_RECENT_ITEM_LIMIT;

  const items = await prisma.inventoryItem.findMany({
    take: normalizedLimit,
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
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      media: {
        take: 1,
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        select: {
          storagePath: true,
        },
      },
    },
  });

  return items.map((item) => {
    const primaryMedia = item.media[0] ?? null;

    return {
      id: item.id,
      name: item.name,
      inventoryType: item.inventoryType,
      quantity: item.quantity,
      containerId: item.container.id,
      containerName: item.container.name,
      containerBinNumber: item.container.binNumber,
      categoryId: item.category?.id ?? null,
      categoryName: item.category?.name ?? null,
      primaryPhotoUrl: primaryMedia
        ? localFilesystemStorageProvider.getPublicUrl(
            primaryMedia.storagePath,
          )
        : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });
}