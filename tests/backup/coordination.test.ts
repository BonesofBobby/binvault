import { afterEach, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { MaintenanceGate } from "@/lib/backup/coordination";
import { createBackup } from "@/lib/backup/backup";
import { restoreBackup } from "@/lib/backup/restore";
import { validateBackup } from "@/lib/backup/validation";
import { snapshotDatabase } from "@/lib/backup/sqlite";
import { fixture } from "./fixtures";

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { for (const clean of cleanups.splice(0)) await clean(); });
async function site() { const f = await fixture(); cleanups.push(f.cleanup); return f; }

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

it("allows concurrent mutations but excludes queued and active backup capture", async () => {
  const gate = new MaintenanceGate(); const order: string[] = [];
  const first = deferred(); const second = deferred(); const finishCapture = deferred();
  const m1 = gate.mutation(async () => { order.push("m1"); await first.promise; });
  const m2 = gate.mutation(async () => { order.push("m2"); await second.promise; });
  const capture = gate.capture(async () => { order.push("capture"); await finishCapture.promise; });
  const m3 = gate.mutation(async () => { order.push("m3"); });
  expect(order).toEqual(["m1", "m2"]);
  first.resolve(); second.resolve(); await Promise.all([m1, m2]);
  await Promise.resolve(); expect(order).toEqual(["m1", "m2", "capture"]);
  finishCapture.resolve(); await Promise.all([capture, m3]);
  expect(order).toEqual(["m1", "m2", "capture", "m3"]);
});

it("keeps mutations queued behind multiple captures", async () => {
  const gate = new MaintenanceGate(); const order: string[] = [];
  const finishMutation = deferred(); const finishFirst = deferred(); const finishSecond = deferred();
  const mutation = gate.mutation(async () => { order.push("existing"); await finishMutation.promise; });
  const first = gate.capture(async () => { order.push("capture1"); await finishFirst.promise; });
  const second = gate.capture(async () => { order.push("capture2"); await finishSecond.promise; });
  const later = gate.mutation(async () => { order.push("later"); });
  finishMutation.resolve(); await mutation; await Promise.resolve();
  expect(order).toEqual(["existing", "capture1"]);
  finishFirst.resolve(); await first; await Promise.resolve();
  expect(order).toEqual(["existing", "capture1", "capture2"]);
  finishSecond.resolve(); await Promise.all([second, later]);
  expect(order).toEqual(["existing", "capture1", "capture2", "later"]);
});

it("releases the gate after rejected mutation and failed capture", async () => {
  const gate = new MaintenanceGate();
  await expect(gate.mutation(async () => { throw new Error("write failed"); })).rejects.toThrow("write failed");
  await expect(gate.capture(async () => { throw new Error("snapshot failed"); })).rejects.toThrow("snapshot failed");
  expect(await gate.mutation(async () => "after failure")).toBe("after failure");
});

it("allows awaited nested service mutation without self-deadlock", async () => {
  const gate = new MaintenanceGate(); const order: string[] = [];
  await gate.mutation(async () => {
    order.push("outer");
    await gate.mutation(async () => { order.push("inner"); });
    await expect(gate.capture(async () => {})).rejects.toThrow("during a mutation");
  });
  expect(order).toEqual(["outer", "inner"]);
});

it("rejects mutations and nested captures attempted within backup capture", async () => {
  const gate = new MaintenanceGate();
  await gate.capture(async () => {
    await expect(gate.mutation(async () => {})).rejects.toThrow("during backup capture");
    await expect(gate.capture(async () => {})).rejects.toThrow("during a mutation or capture");
  });
  expect(await gate.mutation(async () => "released")).toBe("released");
});

it("does not let detached work reuse an already released mutation scope", async () => {
  const gate = new MaintenanceGate(); const finishCapture = deferred(); const order: string[] = [];
  let detached!: Promise<void>;
  await gate.mutation(async () => {
    detached = new Promise<void>((resolve) => setTimeout(() => {
      void gate.mutation(async () => { order.push("detached"); }).then(resolve);
    }, 0));
  });
  const capture = gate.capture(async () => { order.push("capture"); await finishCapture.promise; });
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(order).toEqual(["capture"]);
  finishCapture.resolve(); await Promise.all([capture, detached]);
  expect(order).toEqual(["capture", "detached"]);
});

it("refuses backup or restore defaults inside isolated tests", async () => {
  await expect(createBackup()).rejects.toThrow("injected installation paths");
  await expect(restoreBackup("/tmp/does-not-matter.zip")).rejects.toThrow("injected installation paths");
  await expect(validateBackup("/tmp/does-not-matter.zip", {
    workspace: async () => ({ root: process.cwd(), cleanup: async () => {} }),
  })).rejects.toThrow("repository installation paths");
});

it("captures matching database and media before a queued application mutation begins", async () => {
  const f = await site(); const gate = new MaintenanceGate();
  const snapshotEntered = deferred(); const finishSnapshot = deferred();
  const backupPromise = createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot,
    migrationsRoot: f.migrationsRoot, gate,
    snapshot: async (source, destination) => {
      snapshotEntered.resolve(); await finishSnapshot.promise;
      await snapshotDatabase(source, destination);
    } });
  await snapshotEntered.promise;
  let mutationStarted = false;
  const mutation = gate.mutation(async () => {
    mutationStarted = true;
    const db = new Database(f.databasePath);
    try { db.prepare('UPDATE "Location" SET name = ?').run("After capture"); }
    finally { db.close(); }
    await writeFile(path.join(f.mediaRoot, "inventory", "orphan.txt"), "After capture media");
  });
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(mutationStarted).toBe(false);
  finishSnapshot.resolve();
  const backup = await backupPromise;
  try {
    const verified = await validateBackup(backup.archivePath, { migrationsRoot: f.migrationsRoot });
    try {
      const snapshot = new Database(verified.databasePath, { readonly: true });
      try { expect((snapshot.prepare('SELECT name FROM "Location"').get() as { name: string }).name).toBe("Test room"); }
      finally { snapshot.close(); }
      expect(await readFile(path.join(verified.mediaRoot, "inventory", "orphan.txt"), "utf8")).toBe("owned orphan");
    } finally { await verified.workspace.cleanup(); }
  } finally { await backup.cleanup(); }
  await mutation;
  expect(mutationStarted).toBe(true);
});

it("waits until a database-plus-media mutation finishes before snapshotting", async () => {
  const f = await site(); const gate = new MaintenanceGate();
  const databaseChanged = deferred(); const finishMutation = deferred();
  const mutation = gate.mutation(async () => {
    const db = new Database(f.databasePath);
    try { db.prepare('UPDATE "Location" SET name = ?').run("Completed mutation"); }
    finally { db.close(); }
    databaseChanged.resolve(); await finishMutation.promise;
    await writeFile(path.join(f.mediaRoot, "inventory", "orphan.txt"), "Completed media");
  });
  await databaseChanged.promise;
  let snapshotStarted = false;
  const backupPromise = createBackup({ databasePath: f.databasePath, mediaRoot: f.mediaRoot,
    migrationsRoot: f.migrationsRoot, gate,
    snapshot: async (source, destination) => {
      snapshotStarted = true; await snapshotDatabase(source, destination);
    } });
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(snapshotStarted).toBe(false);
  finishMutation.resolve(); await mutation;
  const backup = await backupPromise;
  try {
    const verified = await validateBackup(backup.archivePath, { migrationsRoot: f.migrationsRoot });
    try {
      const snapshot = new Database(verified.databasePath, { readonly: true });
      try { expect((snapshot.prepare('SELECT name FROM "Location"').get() as { name: string }).name).toBe("Completed mutation"); }
      finally { snapshot.close(); }
      expect(await readFile(path.join(verified.mediaRoot, "inventory", "orphan.txt"), "utf8")).toBe("Completed media");
    } finally { await verified.workspace.cleanup(); }
  } finally { await backup.cleanup(); }
});
