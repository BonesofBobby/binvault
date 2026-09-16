import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await rm(roots.pop()!, { recursive: true, force: true }); });

async function site(contents?: string) {
  const root = await mkdtemp(path.join(tmpdir(), "binvault-env-test-"));
  roots.push(root);
  await mkdir(path.join(root, "data"));
  await symlink(path.join(process.cwd(), "node_modules"), path.join(root, "node_modules"));
  if (contents) await writeFile(path.join(root, ".env.production"), contents);
  return root;
}

function run(root: string, script: string, shellDatabaseUrl?: string) {
  const env = { ...process.env, NODE_ENV: "production" } as NodeJS.ProcessEnv;
  delete env.DATABASE_URL;
  if (shellDatabaseUrl) env.DATABASE_URL = shellDatabaseUrl;
  return spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", script],
    { cwd: root, env, encoding: "utf8" });
}

function resolve(root: string, shellDatabaseUrl?: string) {
  const modulePath = path.join(process.cwd(), "lib", "production", "environment.ts");
  // TSX exposes this CommonJS-transformed TypeScript module as a default export
  // in Node 22; Node 24 also synthesizes named exports. Use their shared shape.
  const script = `import environment from ${JSON.stringify(modulePath)}; console.log(environment.loadProductionEnvironment(${JSON.stringify(root)}));`;
  return run(root, script, shellDatabaseUrl);
}

describe("production environment target", () => {
  it("loads the production file and lets the shell override it", async () => {
    const root = await site('DATABASE_URL="file:./data/from-file.db"\n');
    const fromFile = resolve(root);
    expect(fromFile.stderr).toBe("");
    expect(fromFile.status).toBe(0);
    expect(fromFile.stdout.trim()).toBe("file:./data/from-file.db");
    const fromShell = resolve(root, "file:./data/from-shell.db");
    expect(fromShell.stderr).toBe("");
    expect(fromShell.status).toBe(0);
    expect(fromShell.stdout.trim()).toBe("file:./data/from-shell.db");
  });

  it("fails without a configured database and rejects competing env files", async () => {
    const root = await site();
    expect(resolve(root).status).not.toBe(0);
    expect(resolve(root, "file:./dev.db").status).not.toBe(0);
    await writeFile(path.join(root, ".env"), 'DATABASE_URL="file:./dev.db"\n');
    expect(resolve(root, "file:./data/shell.db").status).not.toBe(0);
  });

  it("gives Prisma config and Next config the same production target", async () => {
    const root = await site('DATABASE_URL="file:./data/from-file.db"\n');
    const prismaPath = path.join(process.cwd(), "prisma.config.ts");
    const nextPath = path.join(process.cwd(), "next.config.ts");
    const prisma = run(root, `import ${JSON.stringify(prismaPath)}; console.log(process.env.DATABASE_URL);`);
    const next = run(root, `import ${JSON.stringify(nextPath)}; console.log(process.env.DATABASE_URL);`);
    expect(prisma.stderr).toBe("");
    expect(next.stderr).toBe("");
    expect(prisma.status).toBe(0);
    expect(next.status).toBe(0);
    expect(prisma.stdout.trim()).toBe("file:./data/from-file.db");
    expect(next.stdout.trim()).toBe(prisma.stdout.trim());
    const shellUrl = "file:./data/from-shell.db";
    expect(run(root, `import ${JSON.stringify(prismaPath)}; console.log(process.env.DATABASE_URL);`, shellUrl).stdout.trim()).toBe(shellUrl);
    expect(run(root, `import ${JSON.stringify(nextPath)}; console.log(process.env.DATABASE_URL);`, shellUrl).stdout.trim()).toBe(shellUrl);
  });
});
