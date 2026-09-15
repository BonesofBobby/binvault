import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

export async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "binvault-recovery-test-"));
  const databasePath = path.join(root, "test.db");
  const mediaRoot = path.join(root, "uploads");
  const recoveryRoot = path.join(root, "recovery");
  await mkdir(path.join(mediaRoot, "inventory"), { recursive: true });
  const db = new Database(databasePath);
  const migrationsRoot = path.join(process.cwd(), "prisma", "migrations");
  try {
    db.exec('CREATE TABLE "_prisma_migrations" (migration_name TEXT, checksum TEXT, finished_at TEXT, rolled_back_at TEXT);');
    const names = (await readdir(migrationsRoot, { withFileTypes: true }))
      .filter((item) => item.isDirectory()).map((item) => item.name).sort();
    for (const name of names) {
      const sql = await readFile(path.join(migrationsRoot, name, "migration.sql"));
      db.exec(sql.toString());
      db.prepare('INSERT INTO "_prisma_migrations" VALUES (?, ?, ?, NULL)').run(name,
        createHash("sha256").update(sql).digest("hex"), new Date().toISOString());
    }
    db.prepare('INSERT INTO "Location" (name, createdAt, updatedAt) VALUES (?, ?, ?)')
      .run("Test room", new Date().toISOString(), new Date().toISOString());
  } finally { db.close(); }
  await writeFile(path.join(mediaRoot, "inventory", "orphan.txt"), "owned orphan");
  return { root, databasePath, mediaRoot, recoveryRoot, migrationsRoot,
    cleanup: () => rm(root, { recursive: true, force: true }) };
}
