import { afterEach, describe, expect, it, vi } from "vitest";
import { lstat, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { checkProductionRuntime, initializeFreshDatabase } from "@/lib/production/runtime";
import { makeProductionFixture } from "./fixtures";

const fixtures: Awaited<ReturnType<typeof makeProductionFixture>>[] = [];
async function fixture() { const value = await makeProductionFixture(); fixtures.push(value); return value; }
afterEach(async () => { vi.unstubAllEnvs(); while (fixtures.length) await fixtures.pop()!.cleanup(); });

describe("production preflight", () => {
  it("rejects missing and unsupported database URLs", async () => {
    const site = await fixture();
    for (const databaseUrl of ["", ":memory:", "file::memory:", "file:./application.db?mode=ro", "postgres://example", "file://host/db"]) {
      const result = await checkProductionRuntime("check", { ...site.options, databaseUrl });
      expect(result.status).toBe("unavailable");
      expect(result.checks.configuration).toBe("failed");
    }
  });

  it("requires production context in the shared validator", async () => {
    const site = await fixture();
    vi.stubEnv("NODE_ENV", undefined);
    expect((await checkProductionRuntime("check", { ...site.options, environment: undefined })).checks.configuration).toBe("failed");
    expect((await checkProductionRuntime("check", { ...site.options, environment: "development" })).checks.configuration).toBe("failed");
    expect((await checkProductionRuntime("check", site.options)).checks.configuration).toBe("ok");
  });

  it("recognizes a fresh relative or absolute file database without creating it", async () => {
    const site = await fixture();
    for (const databaseUrl of ["file:./application.db", `file:${site.databasePath}`]) {
      const result = await checkProductionRuntime("check", { ...site.options, databaseUrl });
      expect(result.status).toBe("ready");
      expect(result.fresh).toBe(true);
      await expect(lstat(site.databasePath)).rejects.toMatchObject({ code: "ENOENT" });
    }
  });

  it("initializes only a preflight-approved fresh database and refuses to replace it", async () => {
    const site = await fixture();
    await initializeFreshDatabase(site.options);
    expect((await lstat(site.databasePath)).size).toBe(0);
    await expect(initializeFreshDatabase(site.options)).rejects.toThrow("Fresh installation preflight");
    expect((await lstat(site.databasePath)).size).toBe(0);
    expect((await checkProductionRuntime("ready", site.options)).status).toBe("unavailable");
  });

  it("accepts an existing current installation and legitimate pending migration prefix", async () => {
    const site = await fixture();
    await site.apply(site.names.length - 1);
    expect((await checkProductionRuntime("check", site.options)).status).toBe("ready");
    expect((await checkProductionRuntime("check", { ...site.options, databaseUrl: "file:./application.db" })).status).toBe("ready");
    const ready = await checkProductionRuntime("ready", site.options);
    expect(ready.status).toBe("unavailable");
    expect(ready.checks.migrations).toBe("failed");
  });

  it("rejects an unsupported Item table before the destructive historical migration", async () => {
    const site = await fixture();
    const db = new Database(site.databasePath);
    db.exec("CREATE TABLE Item (id INTEGER PRIMARY KEY); INSERT INTO Item VALUES (1)");
    db.close();
    const result = await checkProductionRuntime("check", site.options);
    expect(result.status).toBe("unavailable");
    expect(result.legacy).toBe(true);
  });

  it("rejects failed, unknown, and changed migration histories", async () => {
    for (const change of [
      "UPDATE _prisma_migrations SET finished_at=NULL WHERE migration_name=(SELECT migration_name FROM _prisma_migrations LIMIT 1)",
      "UPDATE _prisma_migrations SET checksum='altered' WHERE migration_name=(SELECT migration_name FROM _prisma_migrations LIMIT 1)",
      "UPDATE _prisma_migrations SET migration_name='unknown' WHERE migration_name=(SELECT migration_name FROM _prisma_migrations LIMIT 1)",
    ]) {
      const site = await fixture(); await site.apply();
      const db = new Database(site.databasePath); db.exec(change); db.close();
      expect((await checkProductionRuntime("check", site.options)).checks.migrations).toBe("failed");
    }
  });

  it("rejects a symlinked database and never follows it", async () => {
    const site = await fixture();
    const target = path.join(site.root, "target.db");
    await writeFile(target, "fake");
    await symlink(target, site.databasePath);
    expect((await checkProductionRuntime("check", site.options)).checks.database).toBe("failed");
  });

  it("blocks an unresolved recovery marker without changing it", async () => {
    const site = await fixture(); await site.apply();
    const marker = path.join(site.root, ".binvault-recovery", "restore-state.json");
    await writeFile(marker, "pending");
    expect((await checkProductionRuntime("check", site.options)).checks.recovery).toBe("failed");
    expect((await checkProductionRuntime("ready", site.options)).checks.recovery).toBe("failed");
    expect(await lstat(marker)).toBeTruthy();
  });

  it("accepts an absent recovery root without creating it and rejects a non-directory root", async () => {
    const site = await fixture(); await site.apply();
    const recovery = path.join(site.root, ".binvault-recovery");
    await rm(recovery, { recursive: true });
    expect((await checkProductionRuntime("check", site.options)).checks.recovery).toBe("ok");
    expect((await checkProductionRuntime("ready", site.options)).checks.recovery).toBe("ok");
    await expect(lstat(recovery)).rejects.toMatchObject({ code: "ENOENT" });
    await writeFile(recovery, "not a directory");
    expect((await checkProductionRuntime("check", site.options)).checks.recovery).toBe("failed");
  });

  it("rejects SQLite sidecars during stopped-app preflight", async () => {
    const site = await fixture(); await site.apply();
    for (const suffix of ["-journal", "-wal", "-shm"]) {
      const sidecar = `${site.databasePath}${suffix}`;
      await writeFile(sidecar, "stale");
      expect((await checkProductionRuntime("check", site.options)).checks.database).toBe("failed");
      await rm(sidecar);
    }
  });
});

describe("production readiness", () => {
  it("accepts a complete current installation", async () => {
    const site = await fixture(); await site.apply();
    const result = await checkProductionRuntime("ready", site.options);
    expect(result.status).toBe("ready");
    expect(Object.values(result.checks)).toEqual(Array(6).fill("ok"));
  });

  it("requires a database and rejects a failed migration", async () => {
    const missing = await fixture();
    expect((await checkProductionRuntime("ready", missing.options)).checks.database).toBe("failed");
    const failed = await fixture(); await failed.apply();
    const db = new Database(failed.databasePath);
    db.exec("UPDATE _prisma_migrations SET finished_at=NULL WHERE migration_name=(SELECT migration_name FROM _prisma_migrations LIMIT 1)");
    db.close();
    expect((await checkProductionRuntime("ready", failed.options)).checks.migrations).toBe("failed");
  });

  it("checks only temporary fixture roots for upload, recovery, and temp availability", async () => {
    const site = await fixture(); await site.apply();
    const result = await checkProductionRuntime("ready", { ...site.options, temporaryRoot: path.join(site.root, "missing-temp") });
    expect(result.checks.temporary).toBe("failed");
    await rm(path.join(site.root, "public", "uploads"), { recursive: true });
    expect((await checkProductionRuntime("ready", site.options)).checks.uploads).toBe("failed");
    const marker = path.join(site.root, ".binvault-recovery", "restore-state.json");
    await writeFile(marker, "pending");
    expect((await checkProductionRuntime("ready", site.options)).checks.recovery).toBe("failed");
  });
});
