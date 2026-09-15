import { randomUUID } from "node:crypto";
import type { createBackup } from "./backup";

type ReadyBackup = Awaited<ReturnType<typeof createBackup>>;
type Job = { result: ReadyBackup; expires: NodeJS.Timeout };
const shared = globalThis as typeof globalThis & { binvaultBackupJobs?: Map<string, Job> };
const jobs = shared.binvaultBackupJobs ??= new Map<string, Job>();
const TTL_MS = 15 * 60 * 1000;
const MAX_READY_JOBS = 2;

export function registerBackup(result: ReadyBackup, ttlMs = TTL_MS) {
  while (jobs.size >= MAX_READY_JOBS) {
    const oldest = jobs.entries().next().value as [string, Job];
    jobs.delete(oldest[0]);
    clearTimeout(oldest[1].expires);
    void oldest[1].result.cleanup().catch(() => {});
  }
  const token = randomUUID();
  const expires = setTimeout(() => {
    const job = jobs.get(token);
    if (job) { jobs.delete(token); void job.result.cleanup().catch(() => {}); }
  }, ttlMs);
  expires.unref();
  jobs.set(token, { result, expires });
  return token;
}

export function takeBackup(token: string): ReadyBackup | null {
  const job = jobs.get(token);
  if (!job) return null;
  jobs.delete(token);
  clearTimeout(job.expires);
  return job.result;
}
