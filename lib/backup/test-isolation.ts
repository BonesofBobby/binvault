import { realpath } from "node:fs/promises";
import path from "node:path";

/** Vitest's global setup sets this sentinel; recovery tests must use disposable paths. */
export async function requireTestIsolation(paths: (string | undefined)[]) {
  if (!process.env.BINVAULT_TEST_DATABASE_PATH) return;
  if (paths.some((file) => !file)) throw new Error("Backup tests require injected installation paths.");
  const repository = await realpath(process.cwd());
  for (const file of paths as string[]) {
    const resolved = path.resolve(file);
    const canonical = await realpath(resolved).catch(async () =>
      path.join(await realpath(path.dirname(resolved)), path.basename(resolved)));
    const relative = path.relative(repository, canonical);
    if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
      throw new Error("Backup tests may not use repository installation paths.");
    }
  }
}
