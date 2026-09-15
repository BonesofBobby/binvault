import { afterEach, describe, expect, it } from "vitest";
import { readFile, realpath, stat, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { fixture } from "./fixtures";
import { resolveDatabasePath } from "@/lib/backup/database-path";
import { snapshotDatabase, inspectDatabase } from "@/lib/backup/sqlite";
import { enumerateManagedFiles } from "@/lib/backup/media";
import { createBackup } from "@/lib/backup/backup";
import { validateBackup } from "@/lib/backup/validation";
import { MaintenanceGate } from "@/lib/backup/coordination";
import { restoreBackup } from "@/lib/backup/restore";
import { writeArchive } from "@/lib/backup/archive";
import { validateManifest } from "@/lib/backup/manifest";
import { registerBackup, takeBackup } from "@/lib/backup/jobs";

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { for (const clean of cleanups.splice(0)) await clean(); });
async function site() { const f = await fixture(); cleanups.push(f.cleanup); return f; }

describe("database path and snapshot", () => {
  it("resolves adapter-compatible relative and absolute file URLs", async () => {
    const f = await site();
    expect(await resolveDatabasePath(`file:${f.databasePath}`)).toBe(await realpath(f.databasePath));
    expect(await resolveDatabasePath(`file:${path.relative(process.cwd(), f.databasePath)}`)).toBe(await realpath(f.databasePath));
    const absent = path.join(f.root, "parked.db");
    await expect(resolveDatabasePath(`file:${absent}`)).rejects.toThrow();
    expect(await resolveDatabasePath(`file:${absent}`, { requireExisting: false })).toBe(path.join(await realpath(f.root), "parked.db"));
  });
  it.each(["", ":memory:", "file::memory:", "postgres://host/db", "file://host/db", "file:./a.db?x=1"])
    ("rejects unsupported database URL %s", async (url) => { await expect(resolveDatabasePath(url)).rejects.toThrow(); });
  it("rejects a symlinked database file", async () => {
    const f = await site(); const linked = path.join(f.root, "linked.db");
    await symlink(f.databasePath, linked);
    await expect(resolveDatabasePath(`file:${linked}`)).rejects.toThrow();
  });
  it("uses SQLite backup API without changing source", async () => {
    const f = await site(); const original = await readFile(f.databasePath);
    const dest = path.join(f.root, "snapshot.db");
    await snapshotDatabase(f.databasePath, dest);
    const snapshot = inspectDatabase(dest);
    try { expect((snapshot.prepare('SELECT COUNT(*) AS n FROM "Location"').get() as { n: number }).n).toBe(1); }
    finally { snapshot.close(); }
    expect(await readFile(f.databasePath)).toEqual(original);
  });
  it("captures committed content from a WAL-mode source without copying sidecars", async () => {
    const f = await site();
    const writer = new Database(f.databasePath);
    try {
      writer.pragma("journal_mode = WAL");
      writer.prepare('UPDATE "Location" SET name = ?').run("Committed in WAL");
      const destination = path.join(f.root, "wal-snapshot.db");
      await snapshotDatabase(f.databasePath, destination);
      const snapshot = new Database(destination, { readonly: true });
      try { expect((snapshot.prepare('SELECT name FROM "Location"').get() as { name: string }).name).toBe("Committed in WAL"); }
      finally { snapshot.close(); }
      for (const suffix of ["-wal", "-shm", "-journal"]) {
        await expect(stat(`${destination}${suffix}`)).rejects.toThrow();
      }
      const backup = await createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot, migrationsRoot: f.migrationsRoot });
      try {
        const verified = await validateBackup(backup.archivePath, { migrationsRoot: f.migrationsRoot });
        try {
          for (const suffix of ["-wal", "-shm", "-journal"]) {
            await expect(stat(`${verified.databasePath}${suffix}`)).rejects.toThrow();
          }
        } finally { await verified.workspace.cleanup(); }
      } finally { await backup.cleanup(); }
    } finally { writer.close(); }
  });
});

describe("media and complete archives", () => {
  it("rejects invalid manifest format and version", () => {
    expect(() => validateManifest({ format: "else", formatVersion: 1 })).toThrow();
    expect(() => validateManifest({ format: "binvault-backup", formatVersion: 2 })).toThrow();
  });
  it("rejects malformed manifest types and counts", async () => {
    const f = await site();
    const result = await createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot, migrationsRoot: f.migrationsRoot });
    try {
      expect(() => validateManifest({ ...result.manifest, createdAt: 0 })).toThrow();
      expect(() => validateManifest({ ...result.manifest, counts: { ...result.manifest.counts, events: -1 } })).toThrow();
      expect(() => validateManifest({ ...result.manifest, unreferencedManagedMediaCount: 2 })).toThrow();
      const originalMedia = result.manifest.media[0];
      expect(() => validateManifest({ ...result.manifest,
        media: [originalMedia, { ...originalMedia, path: originalMedia.path.toUpperCase() }],
        mediaCount: 2, mediaBytes: originalMedia.size * 2 })).toThrow("Duplicate media path");
    } finally { await result.cleanup(); }
  });
  it("includes orphan regular media, preserves paths, and skips links", async () => {
    const f = await site();
    await symlink(f.databasePath, path.join(f.mediaRoot, "inventory", "escape"));
    expect((await enumerateManagedFiles(f.mediaRoot)).map((item) => item.relativePath)).toEqual(["inventory/orphan.txt"]);
  });
  it("round trips a database, manifest, and managed media", async () => {
    const f = await site();
    const result = await createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot, migrationsRoot: f.migrationsRoot });
    try {
      expect(result.manifest.mediaCount).toBe(1);
      expect(result.manifest.unreferencedManagedMediaCount).toBe(1);
      const verified = await validateBackup(result.archivePath, { migrationsRoot: f.migrationsRoot });
      try { expect(verified.manifest.counts.locations).toBe(1); expect(await readFile(path.join(verified.mediaRoot, "inventory", "orphan.txt"), "utf8")).toBe("owned orphan"); }
      finally { await verified.workspace.cleanup(); }
    } finally { await result.cleanup(); }
  });
  it("uses a one-time prepared download token", async () => {
    const f = await site();
    const result = await createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot, migrationsRoot: f.migrationsRoot });
    const token = registerBackup(result);
    expect(takeBackup(token)?.archivePath).toBe(result.archivePath);
    expect(takeBackup(token)).toBeNull();
    await result.cleanup();
  });
  it("records missing referenced media without omitting managed orphan files", async () => {
    const f = await site(); const db = new Database(f.databasePath);
    try {
      const now = new Date().toISOString();
      db.prepare('INSERT INTO "Container" (binNumber, name, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)')
        .run("T-1", "Tote", "PARTIAL", now, now);
      db.prepare('INSERT INTO "InventoryItem" (name, containerId, createdAt, updatedAt) VALUES (?, ?, ?, ?)')
        .run("Photo item", 1, now, now);
      db.prepare('INSERT INTO "Media" (fileName, originalName, mimeType, sizeBytes, storagePath, inventoryId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run("missing.jpg", "missing.jpg", "image/jpeg", 10, "inventory/missing.jpg", 1, now, now);
    } finally { db.close(); }
    const result = await createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot, migrationsRoot: f.migrationsRoot });
    try {
      expect(result.manifest.missingReferencedMedia).toEqual(["inventory/missing.jpg"]);
      expect(result.manifest.unreferencedManagedMediaCount).toBe(1);
      const verified = await validateBackup(result.archivePath, { migrationsRoot: f.migrationsRoot });
      await verified.workspace.cleanup();
    } finally { await result.cleanup(); }
  });
  it("rejects a changed media payload and undeclared archive file", async () => {
    const f = await site();
    const result = await createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot, migrationsRoot: f.migrationsRoot });
    try {
      const extracted = await validateBackup(result.archivePath, { migrationsRoot: f.migrationsRoot });
      try {
        const manifestFile = path.join(extracted.workspace.root, "manifest.json");
        const mediaFile = path.join(extracted.mediaRoot, "inventory", "orphan.txt");
        const entries = [{ name: "manifest.json", file: manifestFile },
          { name: "database/binvault.db", file: extracted.databasePath },
          { name: "media/inventory/orphan.txt", file: mediaFile }];
        await writeFile(mediaFile, "modified");
        const mismatched = path.join(f.root, "mismatched.zip");
        await writeArchive(mismatched, entries);
        await expect(validateBackup(mismatched, { migrationsRoot: f.migrationsRoot })).rejects.toThrow("checksum");
        await writeFile(mediaFile, "owned orphan");
        const extra = path.join(f.root, "extra.zip");
        await writeArchive(extra, [...entries, { name: "media/inventory/extra.txt", file: mediaFile }]);
        await expect(validateBackup(extra, { migrationsRoot: f.migrationsRoot })).rejects.toThrow("disagree");
        const missing = path.join(f.root, "missing-payload.zip");
        await writeArchive(missing, entries.slice(0, 2));
        await expect(validateBackup(missing, { migrationsRoot: f.migrationsRoot })).rejects.toThrow("disagree");
        const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
        manifest.unreferencedManagedMediaCount = 0;
        await writeFile(manifestFile, JSON.stringify(manifest));
        const falseCount = path.join(f.root, "false-count.zip");
        await writeArchive(falseCount, entries);
        await expect(validateBackup(falseCount, { migrationsRoot: f.migrationsRoot })).rejects.toThrow("reconciliation");
        const originalDatabase = await readFile(extracted.databasePath);
        const changedDatabase = new Database(extracted.databasePath);
        try { changedDatabase.prepare('UPDATE "Location" SET name = ?').run("Altered candidate"); }
        finally { changedDatabase.close(); }
        const wrongDatabase = path.join(f.root, "wrong-database.zip");
        await writeArchive(wrongDatabase, entries);
        await expect(validateBackup(wrongDatabase, { migrationsRoot: f.migrationsRoot })).rejects.toThrow("Database checksum mismatch");
        await writeFile(extracted.databasePath, originalDatabase);
      } finally { await extracted.workspace.cleanup(); }
    } finally { await result.cleanup(); }
  });
});

describe("maintenance and restore", () => {
  it("waits for in-flight mutation before capture", async () => {
    const gate = new MaintenanceGate(); const sequence: string[] = [];
    let release!: () => void;
    const pending = gate.mutation(async () => { sequence.push("mutation"); await new Promise<void>((resolve) => { release = resolve; }); });
    const capture = gate.capture(async () => { sequence.push("capture"); });
    await Promise.resolve(); expect(sequence).toEqual(["mutation"]);
    release(); await Promise.all([pending, capture]); expect(sequence).toEqual(["mutation", "capture"]);
  });
  it("restores a fake installation and retains a safety backup", async () => {
    const f = await site();
    const result = await createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot, migrationsRoot: f.migrationsRoot });
    try {
      const db = new Database(f.databasePath);
      try { db.prepare('UPDATE "Location" SET name = ?').run("Changed"); } finally { db.close(); }
      await writeFile(path.join(f.mediaRoot, "inventory", "orphan.txt"), "Changed media");
      const restored = await restoreBackup(result.archivePath, { installation: f, migrationsRoot: f.migrationsRoot });
      expect((await stat(restored.safetyPath)).isFile()).toBe(true);
      expect(path.relative(f.mediaRoot, restored.safetyPath).startsWith("..")).toBe(true);
      const safety = await validateBackup(restored.safetyPath, { migrationsRoot: f.migrationsRoot });
      await safety.workspace.cleanup();
      const current = new Database(f.databasePath, { readonly: true });
      try { expect((current.prepare('SELECT name FROM "Location"').get() as { name: string }).name).toBe("Test room"); }
      finally { current.close(); }
      expect(await readFile(path.join(f.mediaRoot, "inventory", "orphan.txt"), "utf8")).toBe("owned orphan");
    } finally { await result.cleanup(); }
  });
});
