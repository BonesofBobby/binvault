export type SearchEntityType =
  | "inventory-item"
  | "container"
  | "location"
  | "category";

export type SearchMatchField =
  | "name"
  | "bin-number"
  | "description"
  | "notes"
  | "manufacturer"
  | "model-number"
  | "serial-number"
  | "part-number"
  | "document-type"
  | "container"
  | "location"
  | "category";

export interface SearchMatch {
  field: SearchMatchField;
  label: string;
  value: string;
}

export interface SearchResult {
  id: string;
  entityId: number;
  entityType: SearchEntityType;
  title: string;
  subtitle: string | null;
  description: string | null;
  href: string;
  searchableText: string;
  matches: SearchMatch[];
  score: number;
  primaryPhotoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResultGroup {
  entityType: SearchEntityType;
  label: string;
  results: SearchResult[];
}

export interface UniversalSearchOptions {
  limit?: number;
  entityTypes?: SearchEntityType[];
}

export interface UniversalSearchResponse {
  query: string;
  normalizedQuery: string;
  results: SearchResult[];
  groups: SearchResultGroup[];
  totalCount: number;
  generatedAt: Date;
}

export interface RecentSearch {
  id: string;
  query: string;
  searchedAt: Date;
}

export interface SearchCommandState {
  isOpen: boolean;
  query: string;
  activeResultId: string | null;
}