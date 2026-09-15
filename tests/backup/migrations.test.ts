import { afterEach, expect, it } from "vitest";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { fixture } from "./fixtures";
import { validateDatabase } from "@/lib/backup/database-validation";

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { for (const clean of cleanups.splice(0)) await clean(); });
async function site() { const f = await fixture(); cleanups.push(f.cleanup); return f; }

it("accepts the current release migration history", async () => {
  const f = await site();
  expect((await validateDatabase(f.databasePath, f.migrationsRoot)).counts.locations).toBe(1);
});

const latest = "20260901000000_add_application_events";
const incompatible: [string, (db: Database.Database) => void][] = [
  ["missing required", (db) => { db.prepare('DELETE FROM "_prisma_migrations" WHERE migration_name = ?').run(latest); }],
  ["unknown extra", (db) => { db.prepare('INSERT INTO "_prisma_migrations" VALUES (?, ?, ?, NULL)').run("20990101000000_future", "bad", "done"); }],
  ["altered checksum", (db) => { db.prepare('UPDATE "_prisma_migrations" SET checksum = ? WHERE migration_name = ?').run("bad", latest); }],
  ["failed state", (db) => { db.prepare('UPDATE "_prisma_migrations" SET finished_at = NULL WHERE migration_name = ?').run(latest); }],
  ["rolled back", (db) => { db.prepare('UPDATE "_prisma_migrations" SET rolled_back_at = ? WHERE migration_name = ?').run("now", latest); }],
];
it.each(incompatible)("rejects %s migration history", async (_label, mutate) => {
  const f = await site(); const db = new Database(f.databasePath);
  try { mutate(db); } finally { db.close(); }
  await expect(validateDatabase(f.databasePath, f.migrationsRoot)).rejects.toThrow("migration history");
});

async function copiedMigrations(f: Awaited<ReturnType<typeof fixture>>) {
  const root = path.join(f.root, "expected-migrations"); await mkdir(root);
  for (const item of await readdir(f.migrationsRoot, { withFileTypes: true })) {
    if (item.isDirectory()) {
      await mkdir(path.join(root, item.name));
      await copyFile(path.join(f.migrationsRoot, item.name, "migration.sql"), path.join(root, item.name, "migration.sql"));
    } else {
      await copyFile(path.join(f.migrationsRoot, item.name), path.join(root, item.name));
    }
  }
  return root;
}

it("rejects unexpected release migration files without modifying repository migrations", async () => {
  const f = await site(); const root = await copiedMigrations(f);
  await validateDatabase(f.databasePath, root);
  await writeFile(path.join(root, "unexpected.txt"), "not a migration");
  await expect(validateDatabase(f.databasePath, root)).rejects.toThrow("filesystem entry");
});

it("rejects a missing or extra migration SQL file in disposable expected history", async () => {
  const f = await site(); const root = await copiedMigrations(f);
  const directory = path.join(root, "20260901000000_add_application_events");
  const sql = await readFile(path.join(directory, "migration.sql"));
  await rm(path.join(directory, "migration.sql"));
  await expect(validateDatabase(f.databasePath, root)).rejects.toThrow("filesystem entry");
  await writeFile(path.join(directory, "migration.sql"), sql);
  await writeFile(path.join(directory, "extra.sql"), "extra");
  await expect(validateDatabase(f.databasePath, root)).rejects.toThrow("filesystem entry");
});
