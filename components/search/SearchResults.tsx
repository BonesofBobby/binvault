import SearchResultCard from "@/components/search/SearchResultCard";
import type {
  SearchResult,
  SearchResultGroup,
  UniversalSearchResponse,
} from "@/lib/types/search";

export interface SearchResultsProps {
  response: UniversalSearchResponse;
  activeResultId?: string | null;
  emptyMessage?: string;
  onSelect?: (result: SearchResult) => void;
}

interface ResultGroupProps {
  group: SearchResultGroup;
  activeResultId: string | null;
  onSelect?: (result: SearchResult) => void;
}

function ResultGroup({
  group,
  activeResultId,
  onSelect,
}: ResultGroupProps) {
  if (group.results.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby={`search-group-${group.entityType}`}
      className="py-2"
    >
      <div className="flex items-center justify-between px-3 py-2">
        <h3
          id={`search-group-${group.entityType}`}
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {group.label}
        </h3>

        <span className="text-xs text-muted-foreground">
          {group.results.length}
        </span>
      </div>

      <div className="space-y-1 px-1">
        {group.results.map((result) => (
          <SearchResultCard
            key={result.id}
            result={result}
            isActive={result.id === activeResultId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

export default function SearchResults({
  response,
  activeResultId = null,
  emptyMessage = "No matching items, containers, locations, or categories found.",
  onSelect,
}: SearchResultsProps) {
  if (response.totalCount === 0) {
    return (
      <div
        role="status"
        className="px-4 py-6 text-center text-sm text-muted-foreground"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <p className="text-xs text-muted-foreground">
          Results for{" "}
          <span className="font-medium text-foreground">
            “{response.query}”
          </span>
        </p>

        <span className="text-xs text-muted-foreground">
          {response.totalCount}{" "}
          {response.totalCount === 1
            ? "result"
            : "results"}
        </span>
      </div>

      <div className="max-h-[28rem] overflow-y-auto">
        {response.groups.map((group) => (
          <ResultGroup
            key={group.entityType}
            group={group}
            activeResultId={activeResultId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}