import { lstat, readdir } from "node:fs/promises";
import path from "node:path";

export type ManagedFile = { relativePath: string; absolutePath: string };

export function validateRelativePath(value: string): void {
  if (!value || value.includes("\\") || value.startsWith("/") || /^(?:[a-z]:|\\\\)/i.test(value) ||
      value.split("/").some((part) => !part || part === "." || part === "..") ||
      value.split("/").length > 12 || value.length > 512 || value.includes("\0")) {
    throw new Error("Unsafe media path.");
  }
}

export async function enumerateManagedFiles(root: string): Promise<ManagedFile[]> {
  const files: ManagedFile[] = [];
  try {
    const mode = await lstat(root);
    if (!mode.isDirectory()) throw new Error("Managed media root must be a directory.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return files;
    throw error;
  }
  async function walk(directory: string, prefix: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      validateRelativePath(relativePath);
      const absolutePath = path.join(directory, entry.name);
      const mode = await lstat(absolutePath);
      if (mode.isSymbolicLink()) continue;
      if (mode.isDirectory()) await walk(absolutePath, relativePath);
      else if (mode.isFile()) files.push({ relativePath, absolutePath });
      // Sockets, devices, and other special files are not BinVault-owned media.
    }
  }
  await walk(root, "");
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));
}
