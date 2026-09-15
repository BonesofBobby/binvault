import { afterEach, expect, it } from "vitest";
import { stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fixture } from "./fixtures";
import { createWorkspace } from "@/lib/backup/workspace";
import { createBackup } from "@/lib/backup/backup";
import { validateBackup } from "@/lib/backup/validation";

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { for (const clean of cleanups.splice(0)) await clean(); });
async function site() { const f = await fixture(); cleanups.push(f.cleanup); return f; }

it("cleans failed snapshot workspace without touching the fake live installation", async () => {
  const f = await site(); let staged = "";
  await expect(createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot,
    workspace: async () => { const w = await createWorkspace(); staged = w.root; return w; },
    snapshot: async () => { throw new Error("snapshot failed"); } })).rejects.toThrow("snapshot failed");
  await expect(stat(staged)).rejects.toThrow();
  expect((await stat(f.databasePath)).isFile()).toBe(true);
});

it("cleans failed archive validation workspace", async () => {
  const f = await site(); const bad = path.join(f.root, "bad.zip"); await writeFile(bad, "invalid");
  let staged = "";
  await expect(validateBackup(bad, { workspace: async () => {
    const w = await createWorkspace(); staged = w.root; return w;
  } })).rejects.toThrow();
  await expect(stat(staged)).rejects.toThrow();
});

it("successful backup cleanup removes its temporary archive", async () => {
  const f = await site();
  const backup = await createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot, migrationsRoot: f.migrationsRoot });
  expect((await stat(backup.archivePath)).isFile()).toBe(true);
  await backup.cleanup();
  await expect(stat(backup.archivePath)).rejects.toThrow();
});
