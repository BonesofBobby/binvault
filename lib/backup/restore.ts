import { copyFile, lstat, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createBackup, type BackupDependencies } from "./backup";
import { validateBackup, type ValidationDependencies } from "./validation";
import { validateDatabase } from "./database-validation";
import { enumerateManagedFiles } from "./media";
import { hashFile } from "./hash";
import { resolveDatabasePath } from "./database-path";
import { requireTestIsolation } from "./test-isolation";

type Installation = { databasePath: string; mediaRoot: string; recoveryRoot: string };
type RecoveryState = { id: string; databaseParked: boolean; databaseInstalled: boolean; mediaExisted: boolean; mediaParked: boolean; mediaInstalled: boolean };
const markerName = "restore-state.json";
const exists = async (file: string) => stat(file).then(() => true, () => false);
const marker = (site: Installation) => path.join(site.recoveryRoot, markerName);
const parkedDb = (site: Installation, id: string) => `${site.databasePath}.rollback-${id}`;
const parkedMedia = (site: Installation, id: string) => `${site.mediaRoot}.rollback-${id}`;

async function writeState(site: Installation, state: RecoveryState) {
  const temporary = `${marker(site)}.tmp-${state.id}`;
  await writeFile(temporary, JSON.stringify(state), { mode: 0o600, flag: "wx" });
  await rename(temporary, marker(site));
}

/** A subsequent recovery invocation can undo a swap interrupted between renames. */
export async function recoverInterrupted(site: Installation) {
  if (!await exists(marker(site))) return false;
  const state = JSON.parse(await readFile(marker(site), "utf8")) as RecoveryState;
  if (!/^[a-f0-9-]{36}$/.test(state.id) ||
      [state.databaseParked, state.databaseInstalled, state.mediaExisted,
        state.mediaParked, state.mediaInstalled].some((value) => typeof value !== "boolean")) {
    throw new Error("Invalid recovery marker; manual inspection required.");
  }
  const previousDb = parkedDb(site, state.id);
  const previousMedia = parkedMedia(site, state.id);
  const hasPreviousDb = await exists(previousDb);
  const hasPreviousMedia = await exists(previousMedia);
  if (((state.databaseParked || state.databaseInstalled) && !hasPreviousDb) ||
      (state.mediaExisted && (state.mediaParked || state.mediaInstalled) && !hasPreviousMedia)) {
    throw new Error("Rollback material is missing; keep BinVault stopped and inspect recovery state.");
  }
  if (hasPreviousDb && !(await lstat(previousDb)).isFile()) {
    throw new Error("Invalid database rollback material; manual inspection required.");
  }
  if (hasPreviousMedia && !(await lstat(previousMedia)).isDirectory()) {
    throw new Error("Invalid media rollback material; manual inspection required.");
  }
  if (hasPreviousMedia) {
    if (await exists(site.mediaRoot)) await rename(site.mediaRoot, `${site.mediaRoot}.failed-${state.id}`);
    await rename(previousMedia, site.mediaRoot);
  } else if (!state.mediaExisted && await exists(site.mediaRoot)) {
    await rename(site.mediaRoot, `${site.mediaRoot}.failed-${state.id}`);
  }
  if (hasPreviousDb) {
    if (await exists(site.databasePath)) await rename(site.databasePath, `${site.databasePath}.failed-${state.id}`);
    await rename(previousDb, site.databasePath);
  }
  if (!await exists(site.databasePath) || (state.mediaExisted && !await exists(site.mediaRoot))) {
    throw new Error("Automatic rollback is incomplete; keep BinVault stopped and inspect recovery state.");
  }
  await rm(marker(site));
  return true;
}

async function verifyInstalled(site: Installation, candidate: Awaited<ReturnType<typeof validateBackup>>, migrationsRoot?: string) {
  await validateDatabase(site.databasePath, migrationsRoot);
  const files = await enumerateManagedFiles(site.mediaRoot);
  if (files.length !== candidate.manifest.mediaCount) throw new Error("Restored media count mismatch.");
  for (const file of candidate.manifest.media) {
    const actual = await hashFile(path.join(site.mediaRoot, ...file.path.split("/")));
    if (actual.sha256 !== file.sha256 || actual.size !== file.size) throw new Error("Restored media checksum mismatch.");
  }
}

export type RestoreDependencies = ValidationDependencies & BackupDependencies & {
  installation?: Installation;
  beforeSwap?: () => Promise<void>;
  afterDatabaseSwap?: () => Promise<void>;
};

export async function restoreBackup(archive: string, dependencies: RestoreDependencies = {}) {
  await requireTestIsolation([dependencies.installation?.databasePath,
    dependencies.installation?.mediaRoot, dependencies.installation?.recoveryRoot]);
  const site = dependencies.installation ?? {
    databasePath: await resolveDatabasePath(),
    mediaRoot: path.join(process.cwd(), "public", "uploads"),
    recoveryRoot: path.join(process.cwd(), ".binvault-recovery"),
  };
  const insideMedia = (file: string) => {
    const relative = path.relative(site.mediaRoot, file);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  };
  if (insideMedia(site.recoveryRoot) || insideMedia(path.resolve(archive))) {
    throw new Error("Archive and recovery storage must be outside managed uploads.");
  }
  await mkdir(site.recoveryRoot, { recursive: true, mode: 0o700 });
  if (!(await lstat(site.recoveryRoot)).isDirectory()) throw new Error("Recovery storage must be a real directory.");
  if (await exists(marker(site))) throw new Error("Interrupted restore detected. Run recovery:recover before another restore.");
  for (const sidecar of ["-wal", "-shm", "-journal"]) {
    if (await exists(`${site.databasePath}${sidecar}`)) {
      throw new Error("SQLite sidecar present. Stop BinVault cleanly and resolve sidecars before restore.");
    }
  }
  if (!(await lstat(site.databasePath)).isFile()) throw new Error("Current database must be a regular file.");
  const candidate = await validateBackup(archive, dependencies);
  const id = randomUUID();
  const stagedDb = `${site.databasePath}.stage-${id}`;
  const stagedMedia = `${site.mediaRoot}.stage-${id}`;
  let safetyPath = "";
  let swapStarted = false;
  const cleanupWarnings: string[] = [];
  try {
    const safety = await createBackup({ ...dependencies, databasePath: site.databasePath, mediaRoot: site.mediaRoot });
    try {
      safetyPath = path.join(site.recoveryRoot, `pre-restore-${new Date().toISOString().replace(/[:.]/g, "-")}-${id}.zip`);
      const pendingSafety = `${safetyPath}.tmp`;
      try {
        await copyFile(safety.archivePath, pendingSafety, constants.COPYFILE_EXCL);
        await rename(pendingSafety, safetyPath);
      } catch (error) {
        await rm(pendingSafety, { force: true }).catch(() => {});
        throw error;
      }
    } finally { await safety.cleanup(); }
    const verifiedSafety = await validateBackup(safetyPath, dependencies);
    await verifiedSafety.workspace.cleanup();

    await copyFile(candidate.databasePath, stagedDb, constants.COPYFILE_EXCL);
    await mkdir(stagedMedia, { mode: 0o700 });
    for (const file of await enumerateManagedFiles(candidate.mediaRoot)) {
      const target = path.join(stagedMedia, ...file.relativePath.split("/"));
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(file.absolutePath, target);
    }
    await dependencies.beforeSwap?.();
    const state: RecoveryState = { id, databaseParked: false, databaseInstalled: false,
      mediaExisted: await exists(site.mediaRoot), mediaParked: false, mediaInstalled: false };
    await writeState(site, state);
    swapStarted = true;
    await rename(site.databasePath, parkedDb(site, id));
    state.databaseParked = true; await writeState(site, state);
    await rename(stagedDb, site.databasePath);
    state.databaseInstalled = true; await writeState(site, state);
    await dependencies.afterDatabaseSwap?.();
    if (await exists(site.mediaRoot)) {
      await rename(site.mediaRoot, parkedMedia(site, id));
      state.mediaParked = true; await writeState(site, state);
    }
    await rename(stagedMedia, site.mediaRoot);
    state.mediaInstalled = true; await writeState(site, state);
    await verifyInstalled(site, candidate, dependencies.migrationsRoot);
    await rm(marker(site));
    swapStarted = false;
    try { await rm(parkedDb(site, id)); }
    catch { cleanupWarnings.push("Old database rollback file could not be removed."); }
    if (state.mediaParked) {
      try { await rm(parkedMedia(site, id), { recursive: true }); }
      catch { cleanupWarnings.push("Old media rollback tree could not be removed."); }
    }
    return { safetyPath, manifest: candidate.manifest, cleanupWarnings };
  } catch (error) {
    if (swapStarted) {
      try { await recoverInterrupted(site); }
      catch { throw new Error("Restore failed and automatic rollback is incomplete. Keep BinVault stopped; inspect recovery state."); }
    }
    throw error;
  } finally {
    try { await candidate.workspace.cleanup(); }
    catch { cleanupWarnings.push("Temporary candidate workspace could not be removed."); }
    try { if (await exists(stagedDb)) await rm(stagedDb); }
    catch { cleanupWarnings.push("Staged database file could not be removed."); }
    try { if (await exists(stagedMedia)) await rm(stagedMedia, { recursive: true }); }
    catch { cleanupWarnings.push("Staged media tree could not be removed."); }
  }
}
