import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type Database from "better-sqlite3";
import { inspectDatabase } from "./sqlite";
import type { Counts } from "./manifest";

const tables: [keyof Counts, string][] = [
  ["locations", "Location"], ["containerTypes", "ContainerType"],
  ["categories", "Category"], ["containers", "Container"],
  ["inventory", "InventoryItem"], ["mediaRecords", "Media"], ["events", "Event"],
];
export function readCounts(db: Database.Database): Counts {
  return Object.fromEntries(tables.map(([key, table]) => [key,
    (db.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get() as { count: number }).count])) as Counts;
}
export function readReferencedMedia(db: Database.Database): string[] {
  return (db.prepare('SELECT "storagePath" FROM "Media" ORDER BY "storagePath"').all() as { storagePath: string }[])
    .map((row) => row.storagePath);
}
export async function validateMigrationHistory(db: Database.Database, migrationsRoot = path.join(process.cwd(), "prisma", "migrations")) {
  const entries = await readdir(migrationsRoot, { withFileTypes: true });
  if (entries.some((item) => !item.isDirectory() &&
      !(item.name === "migration_lock.toml" && item.isFile()))) {
    throw new Error("Unexpected migration filesystem entry.");
  }
  const names = entries.filter((item) => item.isDirectory()).map((item) => item.name).sort();
  const rows = db.prepare('SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations"').all() as
    { migration_name: string; checksum: string; finished_at: string | null; rolled_back_at: string | null }[];
  if (rows.length !== names.length) throw new Error("Incompatible migration history.");
  const byName = new Map(rows.map((row) => [row.migration_name, row]));
  if (byName.size !== rows.length) throw new Error("Duplicate migration history.");
  for (const name of names) {
    const row = byName.get(name);
    const files = await readdir(path.join(migrationsRoot, name), { withFileTypes: true });
    if (files.length !== 1 || files[0].name !== "migration.sql" || !files[0].isFile()) {
      throw new Error("Unexpected migration filesystem entry.");
    }
    const sql = await readFile(path.join(migrationsRoot, name, "migration.sql"));
    const checksum = createHash("sha256").update(sql).digest("hex");
    if (!row?.finished_at || row.rolled_back_at || row.checksum !== checksum) {
      throw new Error("Incompatible migration history.");
    }
  }
}
export async function validateDatabase(file: string, migrationsRoot?: string) {
  const db = inspectDatabase(file);
  try {
    if (db.pragma("journal_mode", { simple: true }) !== "delete") {
      throw new Error("Backup database must be a standalone SQLite file.");
    }
    await validateMigrationHistory(db, migrationsRoot);
    return { counts: readCounts(db), referencedMedia: readReferencedMedia(db) };
  } finally { db.close(); }
}
