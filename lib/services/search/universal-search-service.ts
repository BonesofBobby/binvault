import { prisma } from "@/lib/db/prisma";
import {
  createCategorySearchResult,
  createContainerSearchResult,
  createInventorySearchResult,
  createLocationSearchResult,
} from "@/lib/services/search/search-mappers";
import {
  calculateSearchScore,
  normalizeSearchQuery,
} from "@/lib/services/search/search-utils";
import type {
  SearchEntityType,
  SearchMatch,
  SearchMatchField,
  SearchResult,
  SearchResultGroup,
  UniversalSearchOptions,
  UniversalSearchResponse,
} from "@/lib/types/search";

const DEFAULT_RESULT_LIMIT = 25;
const MAXIMUM_RESULT_LIMIT = 100;

const ENTITY_GROUP_LABELS: Record<SearchEntityType, string> = {
  "inventory-item": "Inventory",
  container: "Containers",
  location: "Locations",
  category: "Categories",
};

interface SearchableField {
  field: SearchMatchField;
  label: string;
  value: string | null | undefined;
  weight: number;
}

function evaluateSearchableFields(
  query: string,
  fields: SearchableField[],
): {
  matches: SearchMatch[];
  score: number;
} {
  const matches: SearchMatch[] = [];
  let score = 0;

  for (const searchableField of fields) {
    const value = searchableField.value?.trim();

    if (!value) {
      continue;
    }

    const fieldScore = calculateSearchScore(query, value);

    if (fieldScore <= 0) {
      continue;
    }

    matches.push({
      field: searchableField.field,
      label: searchableField.label,
      value,
    });

    score += fieldScore * searchableField.weight;
  }

  return {
    matches,
    score,
  };
}

function groupSearchResults(
  results: SearchResult[],
): SearchResultGroup[] {
  const entityOrder: SearchEntityType[] = [
    "inventory-item",
    "container",
    "location",
    "category",
  ];

  return entityOrder
    .map((entityType) => ({
      entityType,
      label: ENTITY_GROUP_LABELS[entityType],
      results: results.filter(
        (result) => result.entityType === entityType,
      ),
    }))
    .filter((group) => group.results.length > 0);
}

function isEntityTypeEnabled(
  entityType: SearchEntityType,
  entityTypes: SearchEntityType[] | undefined,
): boolean {
  return !entityTypes || entityTypes.includes(entityType);
}

function resolveResultLimit(limit: number | undefined): number {
  if (!limit || limit < 1) {
    return DEFAULT_RESULT_LIMIT;
  }

  return Math.min(limit, MAXIMUM_RESULT_LIMIT);
}

export class UniversalSearchService {
  async search(
    query: string,
    options: UniversalSearchOptions = {},
  ): Promise<UniversalSearchResponse> {
    const normalizedQuery = normalizeSearchQuery(query);
    const generatedAt = new Date();

    if (!normalizedQuery) {
      return {
        query,
        normalizedQuery,
        results: [],
        groups: [],
        totalCount: 0,
        generatedAt,
      };
    }

    const [
      inventoryItems,
      containers,
      locations,
      categories,
    ] = await Promise.all([
      isEntityTypeEnabled(
        "inventory-item",
        options.entityTypes,
      )
        ? prisma.inventoryItem.findMany({
            include: {
              container: true,
              category: true,
              media: {
                orderBy: {
                  sortOrder: "asc",
                },
              },
            },
          })
        : Promise.resolve([]),

      isEntityTypeEnabled("container", options.entityTypes)
        ? prisma.container.findMany({
            include: {
              location: true,
            },
          })
        : Promise.resolve([]),

      isEntityTypeEnabled("location", options.entityTypes)
        ? prisma.location.findMany({
            include: {
              parent: true,
            },
          })
        : Promise.resolve([]),

      isEntityTypeEnabled("category", options.entityTypes)
        ? prisma.category.findMany()
        : Promise.resolve([]),
    ]);

    const results: SearchResult[] = [];

    for (const item of inventoryItems) {
      const containerName = item.container.name
        ? `${item.container.binNumber} — ${item.container.name}`
        : item.container.binNumber;

      const categoryName = item.category?.name ?? null;

      const evaluation = evaluateSearchableFields(
        normalizedQuery,
        [
          {
            field: "name",
            label: "Name",
            value: item.name,
            weight: 5,
          },
          {
            field: "manufacturer",
            label: "Manufacturer",
            value: item.manufacturer,
            weight: 3,
          },
          {
            field: "model-number",
            label: "Model number",
            value: item.modelNumber,
            weight: 4,
          },
          {
            field: "serial-number",
            label: "Serial number",
            value: item.serialNumber,
            weight: 5,
          },
          {
            field: "part-number",
            label: "Part number",
            value: item.partNumber,
            weight: 4,
          },
          {
            field: "document-type",
            label: "Document type",
            value: item.documentType,
            weight: 3,
          },
          {
            field: "notes",
            label: "Notes",
            value: item.notes,
            weight: 1,
          },
          {
            field: "container",
            label: "Container",
            value: containerName,
            weight: 2,
          },
          {
            field: "category",
            label: "Category",
            value: categoryName,
            weight: 2,
          },
        ],
      );

      if (evaluation.score <= 0) {
        continue;
      }

      results.push(
        createInventorySearchResult({
          item,
          containerName,
          categoryName,
          primaryMedia: item.media[0] ?? null,
          matches: evaluation.matches,
          score: evaluation.score,
        }),
      );
    }

    for (const container of containers) {
      const evaluation = evaluateSearchableFields(
        normalizedQuery,
        [
          {
            field: "bin-number",
            label: "Bin number",
            value: container.binNumber,
            weight: 5,
          },
          {
            field: "name",
            label: "Name",
            value: container.name,
            weight: 4,
          },
          {
            field: "description",
            label: "Description",
            value: container.description,
            weight: 2,
          },
          {
            field: "notes",
            label: "Notes",
            value: container.notes,
            weight: 1,
          },
          {
            field: "location",
            label: "Location",
            value: container.location?.name,
            weight: 2,
          },
        ],
      );

      if (evaluation.score <= 0) {
        continue;
      }

      results.push(
        createContainerSearchResult(
          container,
          container.location?.name ?? null,
          evaluation.matches,
          evaluation.score,
        ),
      );
    }

    for (const location of locations) {
      const evaluation = evaluateSearchableFields(
        normalizedQuery,
        [
          {
            field: "name",
            label: "Name",
            value: location.name,
            weight: 5,
          },
          {
            field: "location",
            label: "Parent location",
            value: location.parent?.name,
            weight: 2,
          },
        ],
      );

      if (evaluation.score <= 0) {
        continue;
      }

      results.push(
        createLocationSearchResult(
          location,
          location.parent?.name ?? null,
          evaluation.matches,
          evaluation.score,
        ),
      );
    }

    for (const category of categories) {
      const evaluation = evaluateSearchableFields(
        normalizedQuery,
        [
          {
            field: "name",
            label: "Name",
            value: category.name,
            weight: 5,
          },
        ],
      );

      if (evaluation.score <= 0) {
        continue;
      }

      results.push(
        createCategorySearchResult(
          category,
          evaluation.matches,
          evaluation.score,
        ),
      );
    }

    const sortedResults = results.sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (
        right.updatedAt.getTime() !== left.updatedAt.getTime()
      ) {
        return (
          right.updatedAt.getTime() - left.updatedAt.getTime()
        );
      }

      return left.title.localeCompare(right.title);
    });

    const limitedResults = sortedResults.slice(
      0,
      resolveResultLimit(options.limit),
    );

    return {
      query,
      normalizedQuery,
      results: limitedResults,
      groups: groupSearchResults(limitedResults),
      totalCount: sortedResults.length,
      generatedAt,
    };
  }
}

export const universalSearchService =
  new UniversalSearchService();