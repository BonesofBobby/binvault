import { afterEach, expect, it } from "vitest";
import { createWriteStream } from "node:fs";
import { mkdir, open, readFile, realpath, readdir, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import * as yazl from "yazl";
import Database from "better-sqlite3";
import { fixture } from "./fixtures";
import { extractArchive, LIMITS } from "@/lib/backup/archive";
import { validateDatabase } from "@/lib/backup/database-validation";
import { createBackup } from "@/lib/backup/backup";
import { recoverInterrupted, restoreBackup } from "@/lib/backup/restore";
import { resolveDatabasePath } from "@/lib/backup/database-path";
import { validateBackup } from "@/lib/backup/validation";

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { for (const clean of cleanups.splice(0)) await clean(); });
async function site() { const f = await fixture(); cleanups.push(f.cleanup); return f; }
async function outputRoot(f: Awaited<ReturnType<typeof fixture>>) {
  const output = path.join(f.root, "output"); await mkdir(output); return output;
}
async function zipFile(destination: string, entries: { name: string; mode?: number }[]) {
  const zip = new yazl.ZipFile();
  for (const item of entries) zip.addBuffer(Buffer.from("test"), item.name, item.mode ? { mode: item.mode } : undefined);
  zip.end(); await pipeline(zip.outputStream, createWriteStream(destination));
}
async function replaceZipName(archive: string, original: string, replacement: string) {
  if (original.length !== replacement.length) throw new Error("ZIP name test must preserve encoded length.");
  const raw = await readFile(archive);
  const source = raw.toString("binary");
  if (!source.includes(original)) throw new Error("Expected ZIP entry name not found.");
  await writeFile(archive, Buffer.from(source.replaceAll(original, replacement), "binary"));
}

it.each([
  ["case collision", [{ name: "media/A.txt" }, { name: "media/a.txt" }]],
  ["unexpected root", [{ name: "source.ts" }]],
  ["special file", [{ name: "media/link", mode: 0o120777 }]],
  ["FIFO entry", [{ name: "media/fifo", mode: 0o010600 }]],
] as const)("rejects %s", async (_label, entries) => {
  const f = await site(); const archive = path.join(f.root, "malformed.zip");
  await zipFile(archive, [...entries]);
  await expect(extractArchive(archive, await outputRoot(f))).rejects.toThrow();
});

it("rejects a raw ZIP entry containing a backslash", async () => {
  const f = await site(); const archive = path.join(f.root, "backslash.zip");
  await zipFile(archive, [{ name: "media/bad.txt" }]);
  await replaceZipName(archive, "media/bad.txt", "media\\bad.txt");
  await expect(extractArchive(archive, await outputRoot(f))).rejects.toThrow();
});

it.each([
  ["parent traversal", "../evil.txt"],
  ["absolute POSIX", "/etc/xx.txt"],
  ["Windows drive", "C:/evil.txt"],
  ["UNC authority", "//srv/a.txt"],
  ["empty segment", "media//.txt"],
  ["dot segment", "media/./txt"],
] as const)("rejects %s raw ZIP path", async (_label, unsafe) => {
  const f = await site(); const archive = path.join(f.root, "unsafe-name.zip");
  await zipFile(archive, [{ name: "media/a.txt" }]);
  await replaceZipName(archive, "media/a.txt", unsafe);
  await expect(extractArchive(archive, await outputRoot(f))).rejects.toThrow();
});

it("rejects identical duplicate names as well as case collisions", async () => {
  const f = await site(); const archive = path.join(f.root, "duplicate.zip");
  await zipFile(archive, [{ name: "media/A.txt" }, { name: "media/a.txt" }]);
  await replaceZipName(archive, "media/A.txt", "media/a.txt");
  await expect(extractArchive(archive, await outputRoot(f))).rejects.toThrow("Duplicate archive entry");
});

it("rejects a sparse archive exceeding the compressed size cap before opening it", async () => {
  const f = await site(); const archive = path.join(f.root, "oversized.zip");
  const file = await open(archive, "wx");
  try { await file.truncate(LIMITS.archiveBytes + 1); } finally { await file.close(); }
  await expect(extractArchive(archive, await outputRoot(f))).rejects.toThrow("size limit");
});

it("rejects suspicious compression ratio", async () => {
  const f = await site(); const archive = path.join(f.root, "bomb.zip");
  const zip = new yazl.ZipFile();
  zip.addBuffer(Buffer.alloc(1024 * 1024), "media/zeros.bin"); zip.end();
  await pipeline(zip.outputStream, createWriteStream(archive));
  await expect(extractArchive(archive, await outputRoot(f))).rejects.toThrow("safety limit");
});

it.each([
  ["entry count", { entries: 1 }, "Too many archive entries"],
  ["single expanded entry", { entryBytes: 3 }, "safety limit"],
  ["total expansion", { expandedBytes: 7 }, "Expanded archive"],
] as const)("enforces %s limit before unsafe extraction", async (_label, override, message) => {
  const f = await site(); const archive = path.join(f.root, "limited.zip");
  await zipFile(archive, [{ name: "media/a.txt" }, { name: "media/b.txt" }]);
  await expect(extractArchive(archive, await outputRoot(f), { ...LIMITS, ...override })).rejects.toThrow(message);
});

it("rejects a symlinked staging parent before writing any archive bytes", async () => {
  const f = await site(); const archive = path.join(f.root, "staging-link.zip");
  await zipFile(archive, [{ name: "media/redirected.txt" }]);
  const output = await outputRoot(f);
  await symlink(f.mediaRoot, path.join(output, "media"));
  await expect(extractArchive(archive, output)).rejects.toThrow("staging directory");
  await expect(stat(path.join(f.mediaRoot, "redirected.txt"))).rejects.toThrow();
});

it("rejects corrupt SQLite and incompatible migration history", async () => {
  const f = await site();
  const corrupt = path.join(f.root, "corrupt.db"); await writeFile(corrupt, "garbage");
  await expect(validateDatabase(corrupt, f.migrationsRoot)).rejects.toThrow();
  const db = new Database(f.databasePath);
  try { db.prepare('DELETE FROM "_prisma_migrations" WHERE migration_name = ?').run("20260901000000_add_application_events"); }
  finally { db.close(); }
  await expect(validateDatabase(f.databasePath, f.migrationsRoot)).rejects.toThrow();
});

it("rejects a SQLite foreign-key violation", async () => {
  const f = await site(); const db = new Database(f.databasePath);
  try {
    db.pragma("foreign_keys = OFF");
    const now = new Date().toISOString();
    db.prepare('INSERT INTO "InventoryItem" (name, containerId, createdAt, updatedAt) VALUES (?, ?, ?, ?)')
      .run("Orphan row", 99999, now, now);
  } finally { db.close(); }
  await expect(validateDatabase(f.databasePath, f.migrationsRoot)).rejects.toThrow("integrity");
});

it("invalid archive makes no live changes", async () => {
  const f = await site(); const original = await readFile(f.databasePath);
  const originalMedia = await readFile(path.join(f.mediaRoot, "inventory", "orphan.txt"));
  const bad = path.join(f.root, "bad.zip"); await writeFile(bad, "bad");
  await expect(restoreBackup(bad, { installation: f, migrationsRoot: f.migrationsRoot })).rejects.toThrow();
  expect(await readFile(f.databasePath)).toEqual(original);
  expect(await readFile(path.join(f.mediaRoot, "inventory", "orphan.txt"))).toEqual(originalMedia);
});

it("rolls back after an injected failure during database swap", async () => {
  const f = await site();
  const backup = await createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot, migrationsRoot: f.migrationsRoot });
  try {
    const db = new Database(f.databasePath);
    try { db.prepare('UPDATE "Location" SET name = ?').run("Current state"); } finally { db.close(); }
    const mediaFile = path.join(f.mediaRoot, "inventory", "orphan.txt");
    await writeFile(mediaFile, "current media bytes");
    const originalDb = await readFile(f.databasePath);
    const originalMedia = await readFile(mediaFile);
    let sawCandidateActive = false;
    await expect(restoreBackup(backup.archivePath, { installation: f, migrationsRoot: f.migrationsRoot,
      afterDatabaseSwap: async () => {
        const candidate = new Database(f.databasePath, { readonly: true });
        try { sawCandidateActive = (candidate.prepare('SELECT name FROM "Location"').get() as { name: string }).name === "Test room"; }
        finally { candidate.close(); }
        throw new Error("injected swap failure");
      } })).rejects.toThrow("injected swap failure");
    expect(sawCandidateActive).toBe(true);
    expect(await readFile(f.databasePath)).toEqual(originalDb);
    expect(await readFile(mediaFile)).toEqual(originalMedia);
    const current = new Database(f.databasePath, { readonly: true });
    try { expect((current.prepare('SELECT name FROM "Location"').get() as { name: string }).name).toBe("Current state"); }
    finally { current.close(); }
    await expect(stat(path.join(f.recoveryRoot, "restore-state.json"))).rejects.toThrow();
    const safety = (await readdir(f.recoveryRoot)).find((name) => name.startsWith("pre-restore-") && name.endsWith(".zip"));
    expect(safety).toBeDefined();
    const safetyValidation = await validateBackup(path.join(f.recoveryRoot, safety!), { migrationsRoot: f.migrationsRoot });
    try {
      expect(safetyValidation.manifest.mediaCount).toBe(1);
      expect(await readFile(path.join(safetyValidation.mediaRoot, "inventory", "orphan.txt"))).toEqual(originalMedia);
      const safetyDb = new Database(safetyValidation.databasePath, { readonly: true });
      try { expect((safetyDb.prepare('SELECT name FROM "Location"').get() as { name: string }).name).toBe("Current state"); }
      finally { safetyDb.close(); }
    }
    finally { await safetyValidation.workspace.cleanup(); }
  } finally { await backup.cleanup(); }
});

it("keeps an unambiguous recovery marker if parked rollback data disappears", async () => {
  const f = await site();
  const backup = await createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot, migrationsRoot: f.migrationsRoot });
  try {
    await expect(restoreBackup(backup.archivePath, { installation: f, migrationsRoot: f.migrationsRoot,
      afterDatabaseSwap: async () => {
        const parked = (await readdir(f.root)).find((name) => name.startsWith("test.db.rollback-"));
        expect(parked).toBeDefined();
        await rm(path.join(f.root, parked!)); // Only the disposable fake installation.
        throw new Error("forced rollback failure");
      } })).rejects.toThrow("rollback is incomplete");
    expect((await stat(path.join(f.recoveryRoot, "restore-state.json"))).isFile()).toBe(true);
    await expect(recoverInterrupted(f)).rejects.toThrow("Rollback material is missing");
    expect((await stat(path.join(f.recoveryRoot, "restore-state.json"))).isFile()).toBe(true);
    const candidate = new Database(f.databasePath, { readonly: true });
    try { expect((candidate.prepare('SELECT name FROM "Location"').get() as { name: string }).name).toBe("Test room"); }
    finally { candidate.close(); }
  } finally { await backup.cleanup(); }
});

it("a staging failure leaves the live installation untouched", async () => {
  const f = await site(); const original = await readFile(f.databasePath);
  const originalMedia = await readFile(path.join(f.mediaRoot, "inventory", "orphan.txt"));
  const backup = await createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot, migrationsRoot: f.migrationsRoot });
  try {
    await expect(restoreBackup(backup.archivePath, { installation: f, migrationsRoot: f.migrationsRoot,
      beforeSwap: async () => { throw new Error("injected staging failure"); } })).rejects.toThrow("injected staging failure");
    expect(await readFile(f.databasePath)).toEqual(original);
    expect(await readFile(path.join(f.mediaRoot, "inventory", "orphan.txt"))).toEqual(originalMedia);
  } finally { await backup.cleanup(); }
});

it("a safety-snapshot failure prevents every live swap", async () => {
  const f = await site(); const originalDb = await readFile(f.databasePath);
  const originalMedia = await readFile(path.join(f.mediaRoot, "inventory", "orphan.txt"));
  const backup = await createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot, migrationsRoot: f.migrationsRoot });
  try {
    await expect(restoreBackup(backup.archivePath, { installation: f, migrationsRoot: f.migrationsRoot,
      snapshot: async () => { throw new Error("safety snapshot failed"); } })).rejects.toThrow("safety snapshot failed");
    expect(await readFile(f.databasePath)).toEqual(originalDb);
    expect(await readFile(path.join(f.mediaRoot, "inventory", "orphan.txt"))).toEqual(originalMedia);
    await expect(stat(path.join(f.recoveryRoot, "restore-state.json"))).rejects.toThrow();
  } finally { await backup.cleanup(); }
});

it("a safety-backup validation failure retains safety ZIP and leaves live files unchanged", async () => {
  const f = await site(); const originalDb = await readFile(f.databasePath);
  const originalMedia = await readFile(path.join(f.mediaRoot, "inventory", "orphan.txt"));
  const backup = await createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot, migrationsRoot: f.migrationsRoot });
  let inspections = 0;
  try {
    await expect(restoreBackup(backup.archivePath, { installation: f, migrationsRoot: f.migrationsRoot,
      extract: async (archive, root, limits) => {
        inspections++;
        if (inspections === 2) throw new Error("safety validation failed");
        return extractArchive(archive, root, limits);
      } })).rejects.toThrow("safety validation failed");
    expect(inspections).toBe(2);
    expect(await readFile(f.databasePath)).toEqual(originalDb);
    expect(await readFile(path.join(f.mediaRoot, "inventory", "orphan.txt"))).toEqual(originalMedia);
    const safety = (await readdir(f.recoveryRoot)).find((name) => name.startsWith("pre-restore-") && name.endsWith(".zip"));
    expect(safety).toBeDefined();
    const verified = await validateBackup(path.join(f.recoveryRoot, safety!), { migrationsRoot: f.migrationsRoot });
    await verified.workspace.cleanup();
  } finally { await backup.cleanup(); }
});

it("recovers a process interruption after the live database was parked", async () => {
  const f = await site(); const original = await readFile(f.databasePath);
  const id = "12345678-1234-1234-1234-123456789abc";
  await mkdir(f.recoveryRoot);
  await rename(f.databasePath, `${f.databasePath}.rollback-${id}`);
  await writeFile(path.join(f.recoveryRoot, "restore-state.json"), JSON.stringify({
    id, databaseParked: false, databaseInstalled: false, mediaExisted: true,
    mediaParked: false, mediaInstalled: false,
  }));
  expect(await resolveDatabasePath(`file:${f.databasePath}`, { requireExisting: false })).toBe(path.join(await realpath(f.root), "test.db"));
  expect(await recoverInterrupted(f)).toBe(true);
  expect(await readFile(f.databasePath)).toEqual(original);
  expect(await recoverInterrupted(f)).toBe(false);
  await expect(stat(path.join(f.recoveryRoot, "restore-state.json"))).rejects.toThrow();
});

it.each(["-journal", "-wal", "-shm"])("rejects a stopped restore with an old SQLite %s sidecar", async (sidecar) => {
  const f = await site(); const original = await readFile(f.databasePath);
  const backup = await createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot, migrationsRoot: f.migrationsRoot });
  try {
    await writeFile(`${f.databasePath}${sidecar}`, "stale sidecar");
    await expect(restoreBackup(backup.archivePath, { installation: f, migrationsRoot: f.migrationsRoot })).rejects.toThrow("sidecar present");
    expect(await readFile(f.databasePath)).toEqual(original);
    expect(await readFile(path.join(f.mediaRoot, "inventory", "orphan.txt"), "utf8")).toBe("owned orphan");
  } finally { await backup.cleanup(); }
});
