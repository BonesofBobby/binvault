import type {
  Category,
  Container,
  InventoryItem,
  Location,
  Media,
} from "@prisma/client";

import { localFilesystemStorageProvider } from "@/lib/storage/local-filesystem-storage-provider";
import type {
  SearchMatch,
  SearchResult,
} from "@/lib/types/search";

export function createInventorySearchResult(args: {
  item: InventoryItem;
  containerName: string;
  categoryName: string | null;
  primaryMedia: Pick<Media, "storagePath"> | null;
  matches: SearchMatch[];
  score: number;
}): SearchResult {
  const {
    item,
    containerName,
    categoryName,
    primaryMedia,
    matches,
    score,
  } = args;

  return {
    id: `inventory-${item.id}`,
    entityId: item.id,
    entityType: "inventory-item",
    title: item.name,
    subtitle: categoryName,
    description: item.notes,
    href: `/inventory/${item.id}`,
    searchableText: [
      item.name,
      item.manufacturer,
      item.modelNumber,
      item.serialNumber,
      item.partNumber,
      item.notes,
      containerName,
      categoryName,
    ]
      .filter(Boolean)
      .join(" "),
    matches,
    score,
    primaryPhotoUrl: primaryMedia
      ? localFilesystemStorageProvider.getPublicUrl(
          primaryMedia.storagePath,
        )
      : null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function createContainerSearchResult(
  container: Container,
  locationName: string | null,
  matches: SearchMatch[],
  score: number,
): SearchResult {
  return {
    id: `container-${container.id}`,
    entityId: container.id,
    entityType: "container",
    title: container.binNumber,
    subtitle: container.name,
    description: container.description,
    href: `/storage/${container.id}`,
    searchableText: [
      container.binNumber,
      container.name,
      container.description,
      container.notes,
      locationName,
    ]
      .filter(Boolean)
      .join(" "),
    matches,
    score,
    primaryPhotoUrl: null,
    createdAt: container.createdAt,
    updatedAt: container.updatedAt,
  };
}

export function createLocationSearchResult(
  location: Location,
  parentName: string | null,
  matches: SearchMatch[],
  score: number,
): SearchResult {
  return {
    id: `location-${location.id}`,
    entityId: location.id,
    entityType: "location",
    title: location.name,
    subtitle: parentName,
    description: null,
    href: `/locations/${location.id}`,
    searchableText: [
      location.name,
      parentName,
    ]
      .filter(Boolean)
      .join(" "),
    matches,
    score,
    primaryPhotoUrl: null,
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
  };
}

export function createCategorySearchResult(
  category: Category,
  matches: SearchMatch[],
  score: number,
): SearchResult {
  return {
    id: `category-${category.id}`,
    entityId: category.id,
    entityType: "category",
    title: category.name,
    subtitle: null,
    description: null,
    href: `/categories/${category.id}`,
    searchableText: category.name,
    matches,
    score,
    primaryPhotoUrl: null,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}