"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import SearchInput from "@/components/search/SearchInput";
import SearchResults from "@/components/search/SearchResults";
import type { UniversalSearchResponse } from "@/lib/types/search";

export function GlobalSearch() {
  const [response, setResponse] =
    useState<UniversalSearchResponse | null>(null);
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
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  const handleResults = useCallback(
    (nextResponse: UniversalSearchResponse) => {
      setResponse(nextResponse);

      if (nextResponse.normalizedQuery.length >= 2) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    },
    [],
  );

  function handleResultSelected() {
  setIsOpen(false);
}

  const shouldShowDropdown =
    isOpen &&
    response !== null &&
    response.normalizedQuery.length >= 2;

  return (
    <div
      ref={wrapperRef}
      className="relative w-full max-w-xl"
    >
      <SearchInput
        placeholder="Search BinVault..."
        onResults={handleResults}
      />

      {shouldShowDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl">
          <SearchResults
            response={response}
            onSelect={handleResultSelected}
          />
        </div>
      )}
    </div>
  );
}