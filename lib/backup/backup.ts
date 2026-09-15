import { constants, createWriteStream } from "node:fs";
import { mkdir, open, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { maintenanceGate, type MaintenanceGate } from "./coordination";
import { resolveDatabasePath } from "./database-path";
import { snapshotDatabase } from "./sqlite";
import { validateDatabase } from "./database-validation";
import { enumerateManagedFiles, validateRelativePath } from "./media";
import { hashFile } from "./hash";
import { FORMAT, FORMAT_VERSION, type Manifest } from "./manifest";
import { writeArchive, LIMITS } from "./archive";
import { createWorkspace } from "./workspace";
import { requireTestIsolation } from "./test-isolation";

export type BackupDependencies = {
  databasePath?: string;
  mediaRoot?: string;
  workspace?: typeof createWorkspace;
  snapshot?: typeof snapshotDatabase;
  archive?: typeof writeArchive;
  gate?: MaintenanceGate;
  migrationsRoot?: string;
};

export async function createBackup(dependencies: BackupDependencies = {}) {
  await requireTestIsolation([dependencies.databasePath, dependencies.mediaRoot]);
  const workspace = await (dependencies.workspace ?? createWorkspace)();
  await requireTestIsolation([workspace.root]);
  try {
    const databasePath = dependencies.databasePath ?? await resolveDatabasePath();
    const mediaRoot = dependencies.mediaRoot ?? path.join(process.cwd(), "public", "uploads");
    const snapshot = path.join(workspace.root, "binvault.db");
    const mediaStage = path.join(workspace.root, "media-stage");
    const manifestPath = path.join(workspace.root, "manifest.json");
    const archivePath = path.join(workspace.root, "backup.zip");
    const manifest = await (dependencies.gate ?? maintenanceGate).capture(async (): Promise<Manifest> => {
      await (dependencies.snapshot ?? snapshotDatabase)(databasePath, snapshot);
      const { counts, referencedMedia } = await validateDatabase(snapshot, dependencies.migrationsRoot);
      const files = await enumerateManagedFiles(mediaRoot);
      const owned = new Set(files.map((item) => item.relativePath));
      for (const item of referencedMedia) validateRelativePath(item);
      const references = new Set(referencedMedia);
      const media: Manifest["media"] = [];
      for (const item of files) {
        const target = path.join(mediaStage, ...item.relativePath.split("/"));
        await mkdir(path.dirname(target), { recursive: true });
        const source = await open(item.absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW);
        try {
          if (!(await source.stat()).isFile()) throw new Error("Managed media is not a regular file.");
          await pipeline(source.createReadStream(), createWriteStream(target, { flags: "wx", mode: 0o600 }));
        } finally { await source.close().catch(() => {}); }
        media.push({ path: item.relativePath, ...await hashFile(target) });
      }
      const missingReferencedMedia = referencedMedia.filter((item) => !owned.has(item));
      const database = await hashFile(snapshot);
      return {
        format: FORMAT, formatVersion: FORMAT_VERSION, createdAt: new Date().toISOString(),
        database, media, mediaCount: media.length,
        mediaBytes: media.reduce((sum, item) => sum + item.size, 0), counts,
        missingReferencedMedia,
        unreferencedManagedMediaCount: media.filter((item) => !references.has(item.path)).length,
      };
    });
    await writeFile(manifestPath, JSON.stringify(manifest), { flag: "wx", mode: 0o600 });
    if (manifest.mediaCount + 2 > LIMITS.entries ||
        manifest.database.size > LIMITS.entryBytes ||
        manifest.media.some((item) => item.size > LIMITS.entryBytes) ||
        manifest.database.size + manifest.mediaBytes > LIMITS.expandedBytes) {
      throw new Error("Backup content exceeds supported archive limits.");
    }
    const entries = [
      { name: "manifest.json", file: manifestPath },
      { name: "database/binvault.db", file: snapshot },
      ...manifest.media.map((item) => ({ name: `media/${item.path}`, file: path.join(mediaStage, ...item.path.split("/")) })),
    ];
    await (dependencies.archive ?? writeArchive)(archivePath, entries);
    return { archivePath, manifest, cleanup: workspace.cleanup };
  } catch (error) {
    await workspace.cleanup();
    throw error;
  }
}
