import { afterEach, expect, it } from "vitest";
import { stat } from "node:fs/promises";
import { fixture } from "./fixtures";
import { createBackup } from "@/lib/backup/backup";
import { registerBackup, takeBackup } from "@/lib/backup/jobs";
import { GET } from "@/app/api/backup/route";

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { for (const clean of cleanups.splice(0)) await clean(); });
async function site() { const f = await fixture(); cleanups.push(f.cleanup); return f; }
async function waitForCleanup(file: string) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (!await stat(file).then(() => true, () => false)) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Prepared backup workspace was not cleaned.");
}

it("streams a one-time prepared backup and cleans it after download", async () => {
  const f = await site();
  const backup = await createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot, migrationsRoot: f.migrationsRoot });
  const token = registerBackup(backup);
  const response = await GET(new Request(`http://localhost/api/backup?token=${token}`));
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("application/zip");
  expect(response.headers.get("Content-Disposition")).toContain("attachment;");
  expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  await waitForCleanup(backup.archivePath);
  expect(takeBackup(token)).toBeNull();
});

it("cleans a cancelled prepared download and rejects arbitrary tokens", async () => {
  const f = await site();
  const backup = await createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot, migrationsRoot: f.migrationsRoot });
  const token = registerBackup(backup);
  const controller = new AbortController();
  const response = await GET(new Request(`http://localhost/api/backup?token=${token}`, { signal: controller.signal }));
  expect(response.status).toBe(200);
  controller.abort();
  await waitForCleanup(backup.archivePath);
  expect(takeBackup(token)).toBeNull();
  expect(takeBackup("../../dev.db")).toBeNull();
  const rejected = await GET(new Request("http://localhost/api/backup?token=../../dev.db"));
  expect(rejected.status).toBe(404);
});

it("expires an unclaimed job and removes its workspace", async () => {
  const f = await site();
  const backup = await createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot, migrationsRoot: f.migrationsRoot });
  const token = registerBackup(backup, 5);
  await waitForCleanup(backup.archivePath);
  expect(takeBackup(token)).toBeNull();
});
