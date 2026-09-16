import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

export async function makeProductionFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "binvault-production-test-"));
  const databasePath = path.join(root, "application.db");
  const migrationsRoot = path.join(process.cwd(), "prisma", "migrations");
  await mkdir(path.join(root, "public", "uploads"), { recursive: true });
  await mkdir(path.join(root, ".binvault-recovery"));
  const names = (await readdir(migrationsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const apply = async (count = names.length) => {
    const db = new Database(databasePath);
    try {
      db.exec("CREATE TABLE _prisma_migrations (id TEXT PRIMARY KEY, checksum TEXT NOT NULL, migration_name TEXT NOT NULL, finished_at TEXT, rolled_back_at TEXT)");
      for (const name of names.slice(0, count)) {
        const sql = await readFile(path.join(migrationsRoot, name, "migration.sql"));
        db.exec(sql.toString("utf8"));
        const checksum = createHash("sha256").update(sql).digest("hex");
        db.prepare("INSERT INTO _prisma_migrations VALUES (?, ?, ?, ?, NULL)")
          .run(randomUUID(), checksum, name, new Date().toISOString());
      }
    } finally { db.close(); }
  };
  return { root, databasePath, migrationsRoot, names, apply,
    options: { root, databaseUrl: `file:${databasePath}`, temporaryRoot: root,
      migrationsRoot, environment: "production" },
    cleanup: () => rm(root, { recursive: true, force: true }) };
}
