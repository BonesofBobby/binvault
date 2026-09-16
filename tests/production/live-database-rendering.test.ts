import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { randomInt } from "node:crypto";
import { copyFile, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import Database from "better-sqlite3";
import { expect, it } from "vitest";
import packageJson from "../../package.json";
import { makeProductionFixture } from "./fixtures";

async function copyTrackedCheckout(source: string, destination: string) {
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: source })
    .toString("utf8").split("\0").filter(Boolean);
  for (const file of files) {
    await mkdir(path.dirname(path.join(destination, file)), { recursive: true });
    await copyFile(path.join(source, file), path.join(destination, file));
  }
  await symlink(path.join(source, "node_modules"), path.join(destination, "node_modules"), "dir");
  await mkdir(path.join(destination, "public", "uploads"), { recursive: true });
}

async function waitForServer(child: ChildProcess, url: string, getError: () => string) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Disposable production server exited before readiness: ${getError()}`);
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch { /* The server is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Disposable production server did not start.");
}

it("renders the populated runtime database after building against a separate empty database", async () => {
  const source = process.cwd();
  const checkout = await mkdtemp(path.join(tmpdir(), "binvault-live-render-test-"));
  const build = await makeProductionFixture();
  const runtime = await makeProductionFixture();
  let server: ChildProcess | undefined;
  try {
    await build.apply();
    await runtime.apply();
    const empty = new Database(build.databasePath, { readonly: true });
    try { expect(empty.prepare("SELECT COUNT(*) AS count FROM Container").get()).toEqual({ count: 0 }); }
    finally { empty.close(); }
    const live = new Database(runtime.databasePath);
    try {
      live.exec(`
        INSERT INTO Location (name, updatedAt) VALUES ('Runtime test room', CURRENT_TIMESTAMP);
        INSERT INTO ContainerType (name, updatedAt) VALUES ('Runtime test tote', CURRENT_TIMESTAMP);
        INSERT INTO Container (binNumber, name, locationId, containerTypeId, updatedAt)
          VALUES ('RUNTIME-1', 'Runtime test bin', 1, 1, CURRENT_TIMESTAMP);
        INSERT INTO InventoryItem (name, containerId, updatedAt)
          VALUES ('Runtime test item', 1, CURRENT_TIMESTAMP);
      `);
    } finally { live.close(); }
    await copyTrackedCheckout(source, checkout);
    await writeFile(path.join(checkout, ".env.production"), `DATABASE_URL=file:${runtime.databasePath}\n`);
    const next = path.join(checkout, "node_modules", "next", "dist", "bin", "next");
    const buildEnv: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "production", DATABASE_URL: `file:${build.databasePath}` };
    const { execFile } = await import("node:child_process");
    await promisify(execFile)(process.execPath, [next, "build", "--webpack"], {
      cwd: checkout, env: buildEnv, timeout: 120_000, maxBuffer: 8 * 1024 * 1024,
    });

    const port = randomInt(20_000, 60_000);
    const url = `http://127.0.0.1:${port}`;
    const runtimeEnv: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "production" };
    delete runtimeEnv.DATABASE_URL;
    const child = spawn(process.execPath, [next, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: checkout, env: runtimeEnv, stdio: ["ignore", "pipe", "pipe"],
    });
    server = child;
    let serverError = "";
    child.stderr?.on("data", (chunk: Buffer) => { serverError += chunk.toString("utf8"); });
    await waitForServer(child, url, () => serverError);
    const page = async (route: string) => {
      const response = await fetch(`${url}${route}`);
      expect(response.status).toBe(200);
      return response.text();
    };
    expect(await page("/")).toContain("Runtime test item");
    expect(await page("/storage")).toContain("Runtime test bin");
    const newContainer = await page("/storage/new");
    expect(newContainer).toContain("Runtime test room");
    expect(newContainer).toContain("Runtime test tote");
    expect(newContainer).not.toContain("Create a location");
    expect(await page("/inventory")).toContain("Runtime test item");
    expect(await page("/settings/locations")).toContain("Runtime test room");
    expect(await page("/settings/container-types")).toContain("Runtime test tote");
    expect(await page("/storage/1")).toContain("Runtime test bin");
    expect(await page("/inventory/1")).toContain("Runtime test item");
    expect(await page("/inventory/1/edit")).toContain("Runtime test item");
    expect(await page("/inventory/1/move")).toContain("Runtime test item");
    expect(await page("/storage/1/inventory/new")).toContain("Runtime test bin");
    expect(await page("/api/search?q=Runtime%20test%20item")).toContain("Runtime test item");
    expect(await page("/api/health")).toContain(`"version":"${packageJson.version}"`);
    expect(await page("/api/ready")).toContain('"status":"ready"');
    expect(await page("/api/ready")).toContain(`"version":"${packageJson.version}"`);
  } finally {
    server?.kill("SIGTERM");
    await Promise.all([rm(checkout, { recursive: true, force: true }), build.cleanup(), runtime.cleanup()]);
  }
}, 180_000);
