import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export async function createWorkspace() {
  const root = await mkdtemp(path.join(tmpdir(), "binvault-backup-"));
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}
