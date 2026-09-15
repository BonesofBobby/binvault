import { createWriteStream } from "node:fs";
import { lstat, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import * as yazl from "yazl";
import * as yauzl from "yauzl";
import { validateRelativePath } from "./media";

export const LIMITS = {
  archiveBytes: 4 * 1024 ** 3,
  entries: 10_000,
  entryBytes: 512 * 1024 ** 2,
  expandedBytes: 8 * 1024 ** 3,
  compressionRatio: 200,
  manifestBytes: 2 * 1024 ** 2,
};

export async function writeArchive(destination: string, entries: { name: string; file: string }[]): Promise<void> {
  const zip = new yazl.ZipFile();
  for (const entry of entries) {
    validateRelativePath(entry.name);
    zip.addFile(entry.file, entry.name, { compress: false });
  }
  zip.end();
  await pipeline(zip.outputStream, createWriteStream(destination, { flags: "wx" }));
  if ((await stat(destination)).size > LIMITS.archiveBytes) throw new Error("Created backup exceeds archive size limit.");
}

export async function extractArchive(archive: string, root: string, limits = LIMITS): Promise<string[]> {
  if ((await stat(archive)).size > limits.archiveBytes) throw new Error("Backup archive exceeds size limit.");
  if (!(await lstat(root)).isDirectory()) throw new Error("Archive staging root must be a real directory.");
  const zip = await yauzl.openPromise(archive, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true });
  const names: string[] = [];
  const seen = new Set<string>();
  let total = 0;
  try {
    if (zip.entryCount > limits.entries) throw new Error("Too many archive entries.");
    for await (const entry of zip.eachEntry()) {
      const name = entry.fileName;
      validateRelativePath(name);
      if (name !== "manifest.json" && name !== "database/binvault.db" && !name.startsWith("media/")) {
        throw new Error("Unexpected archive entry.");
      }
      if (name === "media/" || name.endsWith("/")) throw new Error("Directory entries are not supported.");
      const folded = name.toLowerCase();
      if (seen.has(folded)) throw new Error("Duplicate archive entry.");
      seen.add(folded);
      const unixMode = entry.externalFileAttributes >>> 16;
      const kind = unixMode & 0o170000;
      if (kind && kind !== 0o100000) throw new Error("Special archive entry rejected.");
      if (entry.isEncrypted() || !entry.canDecodeFileData()) throw new Error("Unsupported archive encoding.");
      if (entry.uncompressedSize > limits.entryBytes ||
          (name === "manifest.json" && entry.uncompressedSize > limits.manifestBytes) ||
          (entry.compressedSize === 0 && entry.uncompressedSize > 0) ||
          (entry.compressedSize && entry.uncompressedSize / entry.compressedSize > limits.compressionRatio)) {
        throw new Error("Archive entry exceeds safety limit.");
      }
      total += entry.uncompressedSize;
      if (total > limits.expandedBytes) throw new Error("Expanded archive exceeds safety limit.");
      const parts = name.split("/");
      let directory = root;
      for (const part of parts.slice(0, -1)) {
        directory = path.join(directory, part);
        try { await mkdir(directory, { mode: 0o700 }); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
        if (!(await lstat(directory)).isDirectory()) throw new Error("Unsafe archive staging directory.");
      }
      const target = path.join(directory, parts.at(-1)!);
      let received = 0;
      const limit = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          received += chunk.length;
          if (received > entry.uncompressedSize || received > limits.entryBytes) callback(new Error("Invalid expanded entry size."));
          else callback(null, chunk);
        },
      });
      await pipeline(await zip.openReadStreamPromise(entry), limit, createWriteStream(target, { flags: "wx", mode: 0o600 }));
      if (received !== entry.uncompressedSize) throw new Error("Incomplete archive entry.");
      names.push(name);
    }
  } finally { zip.close(); }
  return names;
}
