import { loadProductionEnvironment } from "../lib/production/environment";
import { recoverInterrupted, restoreBackup } from "../lib/backup/restore";
import { validateBackup } from "../lib/backup/validation";
import { resolveDatabasePath } from "../lib/backup/database-path";
import path from "node:path";

async function main() {
  const [operation, archive, confirmation] = process.argv.slice(2);
  if (operation === "recover") {
    if (archive !== "--confirm-stopped") throw new Error("Stop BinVault, then pass --confirm-stopped to recover an interrupted restore.");
    loadProductionEnvironment();
    const databasePath = await resolveDatabasePath(undefined, { requireExisting: false });
    const restored = await recoverInterrupted({ databasePath,
      mediaRoot: path.join(process.cwd(), "public", "uploads"),
      recoveryRoot: path.join(process.cwd(), ".binvault-recovery") });
    console.log(restored ? "Interrupted restore rolled back. Inspect data before starting BinVault." : "No interrupted restore found.");
    return;
  }
  if (!archive) throw new Error("Provide a BinVault backup ZIP archive path.");
  if (operation === "validate") {
    const result = await validateBackup(archive);
    try {
      console.log(JSON.stringify({ valid: true, createdAt: result.manifest.createdAt,
        counts: result.manifest.counts, mediaCount: result.manifest.mediaCount,
        missingReferencedMedia: result.manifest.missingReferencedMedia.length }, null, 2));
    } finally { await result.workspace.cleanup(); }
    return;
  }
  if (operation === "restore") {
    if (confirmation !== "--confirm-stopped") {
      throw new Error("Stop BinVault first. Pass --confirm-stopped only after every BinVault process has exited.");
    }
    loadProductionEnvironment();
    const result = await restoreBackup(archive);
    console.log(`Restore verified. Pre-restore safety backup: ${result.safetyPath}`);
    for (const warning of result.cleanupWarnings) console.log(`Warning: ${warning}`);
    console.log("Start BinVault and inspect the restored inventory and media.");
    return;
  }
  throw new Error("Use recovery:validate, recovery:restore, or recovery:recover.");
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Recovery failed.");
  process.exitCode = 1;
});
