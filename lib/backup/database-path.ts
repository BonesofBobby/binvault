import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

/** The adapter removes `file:` and passes the remainder to better-sqlite3. */
export async function resolveDatabasePath(
  url = process.env.DATABASE_URL,
  options: { requireExisting?: boolean; baseDirectory?: string } = {},
): Promise<string> {
  if (!url || !url.startsWith("file:") || url.includes("?") || url.includes("#")) {
    throw new Error("A file-backed SQLite database is required.");
  }
  const name = url.slice(5);
  if (!name || name === ":memory:" || name.startsWith("//") ||
      !(name.startsWith("./") || name.startsWith("../") || name.startsWith("/")) ||
      name.includes("\0") || name.includes("\\")) {
    throw new Error("A file-backed SQLite database is required.");
  }
  // Runtime-only path: a configured database must not make Turbopack bundle the project tree.
  const resolved = path.resolve(/*turbopackIgnore: true*/ options.baseDirectory ?? process.cwd(), name);
  let parent: string;
  try { parent = await realpath(path.dirname(resolved)); }
  catch { throw new Error("A regular file-backed SQLite database is required."); }
  const canonical = path.join(parent, path.basename(resolved));
  try {
    const metadata = await lstat(canonical);
    if (!metadata.isFile()) throw new Error("A regular, non-symlink SQLite database file is required.");
    return canonical;
  } catch (error) {
    if (options.requireExisting === false && (error as NodeJS.ErrnoException).code === "ENOENT") return canonical;
    throw new Error("A regular, non-symlink SQLite database file is required.");
  }
}
