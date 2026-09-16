import { spawn } from "node:child_process";
import path from "node:path";
import { checkProductionRuntime, initializeFreshDatabase, type RuntimeMode } from "../lib/production/runtime";
import { loadProductionEnvironment } from "../lib/production/environment";

async function main() {
  const command = process.argv[2];
  if (!(["check", "init", "ready", "start"] as string[]).includes(command)) {
    throw new Error("Use production:check, production:init, production:ready, or production:start.");
  }
  loadProductionEnvironment();
  const mode: RuntimeMode = command === "check" ? "check" : "ready";
  const options = { environment: process.env.NODE_ENV ?? "production" };
  if (command === "init") {
    await initializeFreshDatabase(options);
    console.log("Created an empty SQLite file for a fresh installation. Run explicit Prisma migrate deploy while BinVault is stopped.");
    return;
  }
  const result = await checkProductionRuntime(mode, options);
  if (result.status !== "ready") {
    const failed = Object.entries(result.checks).filter(([, value]) => value === "failed").map(([name]) => name);
    const legacy = result.legacy ? " Unsupported pre-v1 Item database: export legacy data before migrating." : "";
    throw new Error(`Production ${mode} failed: ${failed.join(", ")}.${legacy} Inspect configuration, permissions, migration history, and docs/BACKUP_RECOVERY.md if recovery is pending.`);
  }
  if (command === "check") {
    console.log(result.fresh ? "Fresh installation accepted. Run explicit Prisma migrate deploy." : "Existing installation preflight passed. Run explicit Prisma migrate deploy if updating.");
    return;
  }
  if (command === "ready") {
    console.log("Production installation is ready.");
    return;
  }
  const child = spawn(process.execPath, [path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next"), "start", ...process.argv.slice(3)], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => child.kill(signal));
  }
  child.once("error", () => { console.error("Next.js production server could not start."); process.exitCode = 1; });
  child.once("exit", (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Production check failed.");
  process.exitCode = 1;
});
