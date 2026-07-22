import { universalSearchService } from "@/lib/services/search/universal-search-service";
import type { SearchEntityType } from "@/lib/types/search";

const VALID_ENTITY_TYPES: SearchEntityType[] = [
  "inventory-item",
  "container",
  "location",
  "category",
];

function parseEntityTypes(
  value: string | null,
): SearchEntityType[] | undefined {
  if (!value) {
    return undefined;
  }

  const entityTypes = value
    .split(",")
    .map((entityType) => entityType.trim())
    .filter(
      (entityType): entityType is SearchEntityType =>
        VALID_ENTITY_TYPES.includes(
          entityType as SearchEntityType,
        ),
    );

  return entityTypes.length > 0
    ? entityTypes
    : undefined;
}

function parseLimit(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsedLimit = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
    return undefined;
  }

  return parsedLimit;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const query =
    url.searchParams.get("query") ??
    url.searchParams.get("q") ??
    "";

  const limit = parseLimit(
    url.searchParams.get("limit"),
  );

  const entityTypes = parseEntityTypes(
    url.searchParams.get("entityTypes"),
  );

  try {
    const response = await universalSearchService.search(
      query,
      {
        limit,
        entityTypes,
      },
    );

    return Response.json(response);
  } catch (error) {
    console.error("Universal search failed:", error);

    return Response.json(
      {
        error: "Search could not be completed.",
      },
      {
        status: 500,
      },
    );
  }
}