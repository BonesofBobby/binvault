import Database from "better-sqlite3";

export function inspectDatabase(file: string) {
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    const integrity = db.pragma("integrity_check") as { integrity_check: string }[];
    const foreignKeys = db.pragma("foreign_key_check") as unknown[];
    if (integrity.length !== 1 || integrity[0].integrity_check !== "ok" || foreignKeys.length) {
      throw new Error("SQLite integrity validation failed.");
    }
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export async function snapshotDatabase(source: string, destination: string): Promise<void> {
  const db = new Database(source, { readonly: true, fileMustExist: true });
  try {
    await db.backup(destination);
  } finally {
    db.close();
  }
  // Normalize only the staged copy to a standalone database file even when the source uses WAL.
  const staged = new Database(destination, { fileMustExist: true });
  try { staged.pragma("journal_mode = DELETE"); }
  finally { staged.close(); }
  const snapshot = inspectDatabase(destination);
  snapshot.close();
}
