import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

const TEST_DIRECTORY_PREFIX = "binvault-vitest-";

function applyMigrations(databasePath: string) {
  const migrationsRoot = path.join(
    process.cwd(),
    "prisma",
    "migrations",
  );
  const migrationDirectories = readdirSync(
    migrationsRoot,
    {
      withFileTypes: true,
    },
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const database = new Database(databasePath);

  try {
    for (const directory of migrationDirectories) {
      const migration = readFileSync(
        path.join(
          migrationsRoot,
          directory,
          "migration.sql",
        ),
        "utf8",
      );

      database.exec(migration);
    }
  } finally {
    database.close();
  }
}

export default function setup() {
  const testDirectory = mkdtempSync(
    path.join(tmpdir(), TEST_DIRECTORY_PREFIX),
  );
  const databasePath = path.join(
    testDirectory,
    "dashboard-tests.db",
  );
  const databaseUrl = `file:${databasePath}`;

  process.env.DATABASE_URL = databaseUrl;
  process.env.BINVAULT_TEST_DATABASE_PATH = databasePath;

  try {
    applyMigrations(databasePath);
  } catch (error) {
    rmSync(testDirectory, {
      recursive: true,
      force: true,
    });
    throw error;
  }

  return () => {
    rmSync(testDirectory, {
      recursive: true,
      force: true,
    });
  };
}
