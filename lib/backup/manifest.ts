import { validateRelativePath } from "./media";

export const FORMAT = "binvault-backup";
export const FORMAT_VERSION = 1;
export type FileDigest = { sha256: string; size: number };
export type MediaDigest = FileDigest & { path: string };
export type Counts = Record<"locations" | "containerTypes" | "categories" | "containers" | "inventory" | "mediaRecords" | "events", number>;
export type Manifest = {
  format: typeof FORMAT;
  formatVersion: typeof FORMAT_VERSION;
  createdAt: string;
  database: FileDigest;
  media: MediaDigest[];
  mediaCount: number;
  mediaBytes: number;
  counts: Counts;
  missingReferencedMedia: string[];
  unreferencedManagedMediaCount: number;
};
const digest = /^[a-f0-9]{64}$/;
function validDigest(value: unknown): value is FileDigest {
  const v = value as FileDigest;
  return !!v && digest.test(v.sha256) && Number.isSafeInteger(v.size) && v.size >= 0;
}
export function validateManifest(input: unknown): Manifest {
  const m = input as Manifest;
  if (!m || m.format !== FORMAT || m.formatVersion !== FORMAT_VERSION ||
      typeof m.createdAt !== "string" || !Number.isFinite(Date.parse(m.createdAt)) || !validDigest(m.database) ||
      !Array.isArray(m.media) || !Array.isArray(m.missingReferencedMedia) ||
      !Number.isSafeInteger(m.mediaCount) || m.mediaCount !== m.media.length ||
      !Number.isSafeInteger(m.mediaBytes) || m.mediaBytes < 0 ||
      !Number.isSafeInteger(m.unreferencedManagedMediaCount) || m.unreferencedManagedMediaCount < 0 ||
      m.unreferencedManagedMediaCount > m.mediaCount) {
    throw new Error("Invalid BinVault backup manifest.");
  }
  const seen = new Set<string>();
  let total = 0;
  for (const file of m.media) {
    if (!validDigest(file)) throw new Error("Invalid media checksum metadata.");
    validateRelativePath(file.path);
    const key = file.path.toLowerCase();
    if (seen.has(key)) throw new Error("Duplicate media path.");
    seen.add(key);
    total += file.size;
  }
  if (total !== m.mediaBytes || !m.counts) throw new Error("Invalid media totals.");
  for (const key of ["locations", "containerTypes", "categories", "containers", "inventory", "mediaRecords", "events"] as const) {
    if (!Number.isSafeInteger(m.counts[key]) || m.counts[key] < 0) throw new Error("Invalid record counts.");
  }
  for (const file of m.missingReferencedMedia) validateRelativePath(file);
  return m;
}
