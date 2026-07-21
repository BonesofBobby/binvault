"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SearchResult = {
  id: number;
  type: "inventory";
  title: string;
  subtitle: string;
  href: string;
  container: string;
  location: string;
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      try {
        setIsLoading(true);

        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("Search request failed.");
        }

        const data = (await response.json()) as {
          results: SearchResult[];
        };

        setResults(data.results);
        setIsOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Search failed:", error);
          setResults([]);
          setIsOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  function handleQueryChange(value: string) {
    setQuery(value);

    if (value.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
    }
  }

  function handleResultSelected() {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setIsLoading(false);
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl">
      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />

      <input
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onFocus={() => {
          if (query.trim().length >= 2) {
            setIsOpen(true);
          }
        }}
        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-10 py-2.5 text-sm outline-none placeholder:text-slate-500 focus:border-blue-500"
        placeholder="Search BinVault..."
        aria-label="Search BinVault"
      />

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
          {isLoading ? (
            <div className="p-4 text-sm text-slate-400">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-slate-400">
              No matching inventory found.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  onClick={handleResultSelected}
                  className="block p-4 transition hover:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-100">
                        {result.title}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {result.subtitle}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300">
                      Inventory
                    </span>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    <p>{result.container}</p>
                    <p>{result.location}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}