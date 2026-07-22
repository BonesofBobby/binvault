"use client";

import { Search } from "lucide-react";
import {
  type ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import type { UniversalSearchResponse } from "@/lib/types/search";

export interface SearchInputProps {
  placeholder?: string;
  debounceMs?: number;
  minCharacters?: number;
  className?: string;
  onResults?: (
    results: UniversalSearchResponse,
  ) => void;
}

function createEmptyResponse(
  query: string,
): UniversalSearchResponse {
  return {
    query,
    normalizedQuery: query.trim().toLowerCase(),
    results: [],
    groups: [],
    totalCount: 0,
    generatedAt: new Date(),
  };
}

export default function SearchInput({
  placeholder = "Search BinVault...",
  debounceMs = 300,
  minCharacters = 2,
  className = "",
  onResults,
}: SearchInputProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(
    null,
  );

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < minCharacters) {
      abortRef.current?.abort();
      onResults?.(createEmptyResponse(query));

      return;
    }

    const timeout = window.setTimeout(async () => {
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);

      try {
        const response = await fetch(
          `/api/search?query=${encodeURIComponent(
            trimmedQuery,
          )}`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(
            `Search request failed with status ${response.status}.`,
          );
        }

        const data =
          (await response.json()) as UniversalSearchResponse;

        onResults?.(data);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error("Search request failed:", error);
        onResults?.(createEmptyResponse(query));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    query,
    debounceMs,
    minCharacters,
    onResults,
  ]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function handleQueryChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextQuery = event.target.value;

    if (nextQuery.trim().length < minCharacters) {
      abortRef.current?.abort();
      setLoading(false);
    }

    setQuery(nextQuery);
  }

  return (
    <div className={`relative ${className}`}>
      <Search
        aria-hidden="true"
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />

      <input
        type="search"
        value={query}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={handleQueryChange}
        className="h-10 w-full rounded-md border bg-background pl-10 pr-24 text-sm outline-none transition focus:ring-2 focus:ring-primary"
      />

      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
        >
          Searching…
        </div>
      )}
    </div>
  );
}