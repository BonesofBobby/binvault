export function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function tokenizeSearchQuery(query: string): string[] {
  return normalizeSearchQuery(query)
    .split(" ")
    .filter(Boolean);
}

export function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase();
}

export function containsNormalizedText(
  haystack: string,
  needle: string,
): boolean {
  return normalizeSearchText(haystack).includes(
    normalizeSearchText(needle),
  );
}

export function calculateSearchScore(
  query: string,
  value: string,
): number {
  const normalizedQuery = normalizeSearchQuery(query);
  const normalizedValue = normalizeSearchText(value);

  if (!normalizedQuery || !normalizedValue) {
    return 0;
  }

  // Exact match
  if (normalizedValue === normalizedQuery) {
    return 100;
  }

  // Starts with query
  if (normalizedValue.startsWith(normalizedQuery)) {
    return 90;
  }

  // Contains whole query
  if (normalizedValue.includes(normalizedQuery)) {
    return 75;
  }

  // Token matching
  const queryTokens = tokenizeSearchQuery(normalizedQuery);
  const valueTokens = tokenizeSearchQuery(normalizedValue);

  let score = 0;

  for (const token of queryTokens) {
    if (valueTokens.includes(token)) {
      score += 20;
    } else if (normalizedValue.includes(token)) {
      score += 10;
    }
  }

  return Math.min(score, 70);
}