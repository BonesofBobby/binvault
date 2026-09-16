import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, lstat, open, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { resolveDatabasePath } from "@/lib/backup/database-path";

export type RuntimeMode = "check" | "ready";
export type CheckName = "configuration" | "database" | "migrations" | "uploads" | "recovery" | "temporary";
export type RuntimeChecks = Record<CheckName, "ok" | "failed">;
export type RuntimeResult = { status: "ready" | "unavailable"; fresh: boolean; legacy: boolean; checks: RuntimeChecks };
export type RuntimeOptions = {
  root?: string;
  databaseUrl?: string;
  temporaryRoot?: string;
  environment?: string;
  migrationsRoot?: string;
};

const names: CheckName[] = ["configuration", "database", "migrations", "uploads", "recovery", "temporary"];
const isMissing = (error: unknown) => (error as NodeJS.ErrnoException)?.code === "ENOENT";

async function regularDirectory(directory: string, writable = true) {
  const entry = await lstat(directory);
  if (!entry.isDirectory()) throw new Error("not a regular directory");
  await access(directory, constants.R_OK | (writable ? constants.W_OK : 0));
}

async function expectedMigrations(root: string) {
  const entries = await readdir(root, { withFileTypes: true });
  if (entries.some((entry) => !entry.isDirectory() &&
      !(entry.name === "migration_lock.toml" && entry.isFile()))) {
    throw new Error("unexpected migration file");
  }
  const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  if (!directories.length) throw new Error("no migrations");
  return Promise.all(directories.map(async (name) => {
    const directory = path.join(root, name);
    const files = await readdir(directory, { withFileTypes: true });
    if (files.length !== 1 || files[0].name !== "migration.sql" || !files[0].isFile()) {
      throw new Error("unexpected migration file");
    }
    const checksum = createHash("sha256").update(await readFile(path.join(directory, "migration.sql"))).digest("hex");
    return { name, checksum };
  }));
}

function inspectExistingDatabase(file: string, expected: Awaited<ReturnType<typeof expectedMigrations>>, mode: RuntimeMode) {
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    // This historical table is destroyed by the inventory migration; it is not a supported upgrade.
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='Item'").get()) {
      return { database: false, migrations: false, legacy: true };
    }
    if (mode === "check") {
      const integrity = db.pragma("integrity_check") as { integrity_check: string }[];
      if (integrity.length !== 1 || integrity[0].integrity_check !== "ok" ||
          (db.pragma("foreign_key_check") as unknown[]).length) {
        return { database: false, migrations: false, legacy: false };
      }
    } else {
      db.prepare("SELECT 1").get();
    }
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'").get()) {
      return { database: true, migrations: false, legacy: false };
    }
    const applied = db.prepare('SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name').all() as
      { migration_name: string; checksum: string; finished_at: string | null; rolled_back_at: string | null }[];
    const validPrefix = applied.length <= expected.length && applied.every((row, index) =>
      row.migration_name === expected[index]?.name && row.checksum === expected[index]?.checksum &&
      Boolean(row.finished_at) && !row.rolled_back_at);
    return { database: true, migrations: validPrefix && (mode === "check" || applied.length === expected.length), legacy: false };
  } finally {
    db.close();
  }
}

/** Metadata and read-only SQLite inspection. Never creates or repairs installation files. */
export async function checkProductionRuntime(mode: RuntimeMode, options: RuntimeOptions = {}): Promise<RuntimeResult> {
  const root = options.root ?? process.cwd();
  const checks = Object.fromEntries(names.map((name) => [name, "ok"])) as RuntimeChecks;
  const environment = options.environment ?? process.env.NODE_ENV;
  if (environment !== "production") checks.configuration = "failed";
  const configuredUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  let databasePath: string | undefined;
  try {
    databasePath = await resolveDatabasePath(configuredUrl, { requireExisting: false, baseDirectory: root });
    await regularDirectory(path.dirname(databasePath));
  } catch {
    checks.configuration = "failed";
    checks.database = "failed";
    checks.migrations = "failed";
  }
  try { await regularDirectory(path.join(root, "public", "uploads")); }
  catch { checks.uploads = "failed"; }
  const recoveryRoot = path.join(root, ".binvault-recovery");
  try {
    const entry = await lstat(recoveryRoot);
    if (!entry.isDirectory()) checks.recovery = "failed";
    else {
      await regularDirectory(recoveryRoot);
      try { await lstat(path.join(recoveryRoot, "restore-state.json")); checks.recovery = "failed"; }
      catch (error) { if (!isMissing(error)) checks.recovery = "failed"; }
    }
  } catch (error) { if (!isMissing(error)) checks.recovery = "failed"; }
  try { await regularDirectory(options.temporaryRoot ?? tmpdir()); }
  catch { checks.temporary = "failed"; }

  let fresh = false;
  let legacy = false;
  let sidecarPresent = false;
  if (databasePath) {
    if (mode === "check") {
      for (const suffix of ["-wal", "-shm", "-journal"]) {
        try { await lstat(`${databasePath}${suffix}`); sidecarPresent = true; }
        catch (error) { if (!isMissing(error)) sidecarPresent = true; }
      }
    }
    try {
      const entry = await lstat(databasePath);
      if (!entry.isFile()) throw new Error("not a regular database");
      await access(databasePath, constants.R_OK | constants.W_OK);
      try {
        const expected = await expectedMigrations(options.migrationsRoot ?? path.join(root, "prisma", "migrations"));
        const inspected = inspectExistingDatabase(databasePath, expected, mode);
        legacy = inspected.legacy;
        if (!inspected.database) checks.database = "failed";
        if (!inspected.migrations) checks.migrations = "failed";
      } catch { checks.database = "failed"; checks.migrations = "failed"; }
    } catch (error) {
      if (isMissing(error) && mode === "check") fresh = true;
      else { checks.database = "failed"; checks.migrations = "failed"; }
    }
  }
  if (fresh) {
    // A fresh preflight may proceed to explicit migrate deploy without creating the database.
    checks.database = "ok";
    try { await expectedMigrations(options.migrationsRoot ?? path.join(root, "prisma", "migrations")); checks.migrations = "ok"; }
    catch { checks.migrations = "failed"; }
  }
  if (sidecarPresent) checks.database = "failed";
  return { status: names.every((name) => checks[name] === "ok") ? "ready" : "unavailable", fresh, legacy, checks };
}

/** Explicit fresh-install step for the current Prisma SQLite CLI, which cannot create a missing file. */
export async function initializeFreshDatabase(options: RuntimeOptions = {}): Promise<void> {
  if (process.env.BINVAULT_TEST_DATABASE_PATH && (!options.root || !options.databaseUrl)) {
    throw new Error("Isolated tests must inject the installation root and database URL.");
  }
  const preflight = await checkProductionRuntime("check", options);
  if (preflight.status !== "ready" || !preflight.fresh) {
    throw new Error("Fresh installation preflight must pass before database initialization.");
  }
  const databasePath = await resolveDatabasePath(options.databaseUrl ?? process.env.DATABASE_URL,
    { requireExisting: false, baseDirectory: options.root ?? process.cwd() });
  const file = await open(databasePath, "wx", 0o600);
  await file.close();
}
