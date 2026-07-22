import {
  Archive,
  Boxes,
  FolderTree,
  MapPin,
  PackageSearch,
} from "lucide-react";
import Link from "next/link";

import type {
  SearchEntityType,
  SearchResult,
} from "@/lib/types/search";

export interface SearchResultCardProps {
  result: SearchResult;
  isActive?: boolean;
  onSelect?: (result: SearchResult) => void;
}

interface EntityPresentation {
  label: string;
  icon: typeof PackageSearch;
}

const ENTITY_PRESENTATION: Record<
  SearchEntityType,
  EntityPresentation
> = {
  "inventory-item": {
    label: "Inventory",
    icon: PackageSearch,
  },
  container: {
    label: "Container",
    icon: Boxes,
  },
  location: {
    label: "Location",
    icon: MapPin,
  },
  category: {
    label: "Category",
    icon: FolderTree,
  },
};

export default function SearchResultCard({
  result,
  isActive = false,
  onSelect,
}: SearchResultCardProps) {
  const presentation =
    ENTITY_PRESENTATION[result.entityType];

  const Icon = presentation.icon;

  const matchedFields = result.matches
    .slice(0, 2)
    .map((match) => `${match.label}: ${match.value}`);

  function handleClick() {
    onSelect?.(result);
  }

  return (
    <Link
      href={result.href}
      onClick={handleClick}
      aria-current={isActive ? "true" : undefined}
      className={[
        "group flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "bg-accent text-accent-foreground"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background">
        <Icon
          aria-hidden="true"
          className="h-4 w-4 text-muted-foreground"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {result.title}
            </p>

            {result.subtitle && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {result.subtitle}
              </p>
            )}
          </div>

          <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {presentation.label}
          </span>
        </div>

        {result.description && (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {result.description}
          </p>
        )}

        {matchedFields.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {matchedFields.map((match) => (
              <span
                key={match}
                className="max-w-full truncate rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground"
              >
                {match}
              </span>
            ))}
          </div>
        )}

        {result.entityType === "container" &&
          result.matches.length === 0 && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Archive
                aria-hidden="true"
                className="h-3 w-3"
              />
              Storage container
            </div>
          )}
      </div>
    </Link>
  );
}