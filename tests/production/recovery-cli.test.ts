import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createBackup } from "@/lib/backup/backup";
import { fixture } from "../backup/fixtures";

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { while (cleanups.length) await cleanups.pop()!(); });

async function disposableCli() {
  const backupSite = await fixture();
  cleanups.push(backupSite.cleanup);
  const backup = await createBackup({ databasePath: backupSite.databasePath,
    mediaRoot: backupSite.mediaRoot, migrationsRoot: backupSite.migrationsRoot });
  cleanups.push(backup.cleanup);
  const root = await mkdtemp(path.join(tmpdir(), "binvault-recovery-cli-test-"));
  cleanups.push(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "prisma"));
  await symlink(path.join(process.cwd(), "prisma", "migrations"), path.join(root, "prisma", "migrations"));
  await symlink(path.join(process.cwd(), "node_modules"), path.join(root, "node_modules"));
  await mkdir(path.join(root, "data"));
  await mkdir(path.join(root, "public", "uploads", "inventory"), { recursive: true });
  const liveDatabase = path.join(root, "data", "live.db");
  const liveMedia = path.join(root, "public", "uploads", "inventory", "sentinel.txt");
  await writeFile(liveDatabase, "invalid disposable live database");
  await writeFile(liveMedia, "disposable live media");
  return { root, archive: backup.archivePath, liveDatabase, liveMedia };
}

function command(root: string, operation: string, args: string[], databaseUrl?: string) {
  const env = { ...process.env, NODE_ENV: "production" } as NodeJS.ProcessEnv;
  delete env.DATABASE_URL;
  if (databaseUrl) env.DATABASE_URL = databaseUrl;
  return spawnSync(process.execPath,
    ["--import", "tsx", path.join(process.cwd(), "scripts", "recovery.ts"), operation, ...args],
    { cwd: root, env, encoding: "utf8" });
}

describe("recovery CLI environment boundary", () => {
  it("validates a portable archive without a database URL or production env file", async () => {
    const site = await disposableCli();
    const databaseBefore = await readFile(site.liveDatabase);
    const mediaBefore = await readFile(site.liveMedia);
    const result = command(site.root, "validate", [site.archive]);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ valid: true, counts: { locations: 1 } });
    expect(await readFile(site.liveDatabase)).toEqual(databaseBefore);
    expect(await readFile(site.liveMedia)).toEqual(mediaBefore);

    // An unrelated local env file must not affect an offline archive check.
    await writeFile(path.join(site.root, ".env"), 'DATABASE_URL="file:./dev.db"\n');
    expect(command(site.root, "validate", [site.archive]).status).toBe(0);
  });

  it("keeps restore and recover behind production configuration", async () => {
    const site = await disposableCli();
    const databaseBefore = await readFile(site.liveDatabase);
    const mediaBefore = await readFile(site.liveMedia);
    expect(command(site.root, "restore", [site.archive], "file:./data/live.db").stderr).toContain("--confirm-stopped");
    expect(command(site.root, "recover", [], "file:./data/live.db").stderr).toContain("--confirm-stopped");
    for (const [operation, args] of [
      ["restore", [site.archive, "--confirm-stopped"]],
      ["recover", ["--confirm-stopped"]],
    ] as const) {
      expect(command(site.root, operation, [...args]).stderr).toContain("Production DATABASE_URL is required");
      expect(command(site.root, operation, [...args], "file:./dev.db").stderr).toContain("development database");
    }
    await writeFile(path.join(site.root, ".env"), 'DATABASE_URL="file:./dev.db"\n');
    for (const [operation, args] of [
      ["restore", [site.archive, "--confirm-stopped"]],
      ["recover", ["--confirm-stopped"]],
    ] as const) {
      expect(command(site.root, operation, [...args], "file:./data/live.db").stderr).toContain("Ambiguous production environment");
    }
    expect(await readFile(site.liveDatabase)).toEqual(databaseBefore);
    expect(await readFile(site.liveMedia)).toEqual(mediaBefore);
  });
});
