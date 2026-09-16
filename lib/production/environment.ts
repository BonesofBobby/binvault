import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

/** Production uses only .env.production or an explicit shell DATABASE_URL. */
export function loadProductionEnvironment(root = process.cwd()) {
  for (const name of [".env", ".env.local", ".env.production.local"]) {
    if (existsSync(path.join(root, name))) {
      throw new Error(`Ambiguous production environment: remove ${name} from this installation.`);
    }
  }
  loadEnvConfig(root, false, { info() {}, error() {} });
  if (!process.env.DATABASE_URL) {
    throw new Error("Production DATABASE_URL is required in the shell or .env.production.");
  }
  if (!process.env.DATABASE_URL.startsWith("file:")) {
    throw new Error("Production requires a file-backed SQLite DATABASE_URL.");
  }
  if (path.basename(process.env.DATABASE_URL.slice(5).split("?")[0]) === "dev.db") {
    throw new Error("The development database cannot be selected for production operation.");
  }
  return process.env.DATABASE_URL;
}
