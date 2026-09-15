import { readFile } from "node:fs/promises";
import path from "node:path";
import { extractArchive } from "./archive";
import { validateDatabase } from "./database-validation";
import { hashFile } from "./hash";
import { validateManifest, type Manifest } from "./manifest";
import { createWorkspace } from "./workspace";
import { requireTestIsolation } from "./test-isolation";

export type ValidationDependencies = {
  workspace?: typeof createWorkspace;
  extract?: typeof extractArchive;
  migrationsRoot?: string;
};
export async function validateBackup(archive: string, dependencies: ValidationDependencies = {}) {
  const workspace = await (dependencies.workspace ?? createWorkspace)();
  await requireTestIsolation([workspace.root]);
  try {
    const names = await (dependencies.extract ?? extractArchive)(archive, workspace.root);
    const raw = await readFile(path.join(workspace.root, "manifest.json"));
    if (raw.length > 2 * 1024 ** 2) throw new Error("Manifest exceeds size limit.");
    const manifest: Manifest = validateManifest(JSON.parse(raw.toString("utf8")));
    const expected = new Set(["manifest.json", "database/binvault.db", ...manifest.media.map((file) => `media/${file.path}`)]);
    if (names.length !== expected.size || names.some((name) => !expected.has(name))) {
      throw new Error("Archive and manifest entries disagree.");
    }
    const databasePath = path.join(workspace.root, "database", "binvault.db");
    const database = await hashFile(databasePath);
    if (database.sha256 !== manifest.database.sha256 || database.size !== manifest.database.size) {
      throw new Error("Database checksum mismatch.");
    }
    for (const file of manifest.media) {
      const actual = await hashFile(path.join(workspace.root, "media", ...file.path.split("/")));
      if (actual.sha256 !== file.sha256 || actual.size !== file.size) throw new Error("Media checksum mismatch.");
    }
    const { counts, referencedMedia } = await validateDatabase(databasePath, dependencies.migrationsRoot);
    for (const key of Object.keys(counts) as (keyof typeof counts)[]) {
      if (counts[key] !== manifest.counts[key]) throw new Error("Manifest record counts disagree with database.");
    }
    const managed = new Set(manifest.media.map((item) => item.path));
    const missing = referencedMedia.filter((item) => !managed.has(item));
    const referenced = new Set(referencedMedia);
    if (manifest.media.filter((item) => !referenced.has(item.path)).length !== manifest.unreferencedManagedMediaCount) {
      throw new Error("Manifest media reconciliation disagrees with database.");
    }
    if (missing.length !== manifest.missingReferencedMedia.length ||
      missing.some((item, index) => item !== manifest.missingReferencedMedia[index])) {
      throw new Error("Manifest media reconciliation disagrees with database.");
    }
    return { workspace, databasePath, mediaRoot: path.join(workspace.root, "media"), manifest };
  } catch (error) {
    await workspace.cleanup();
    throw error;
  }
}
