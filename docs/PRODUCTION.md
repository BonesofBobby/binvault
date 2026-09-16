# Production operation (v1)

BinVault v1 is one Node.js server on a trusted computer or private network, using a regular file-backed SQLite database and local `public/uploads` media. It has no authentication. Bind Next.js to loopback unless access is restricted to trusted users by host controls. Standard `next start` is the supported server output; `npm run production:start` checks readiness first. Run only one BinVault application process. Optional external supervision can be configured by an operator later.

Use Node 24 LTS and npm 11.17.0. Node 22.12+ remains in the declared support range and has an independent fresh-install CI job; CI results must confirm compatibility. Install all locked dependencies with `npm ci` because the Prisma CLI, `tsx`, and production operator commands are needed during preparation. Do not run seed, `db push`, `migrate reset`, or an automatic migration at application startup.

## Fresh installation

1. Install the repository and run `npm ci` and `npx prisma generate`.
2. Create a private database parent directory and `public/uploads`; grant the BinVault account read/write access. `.binvault-recovery` may be absent initially; BinVault creates it only when recovery operations need it. Copy `.env.example` to an ignored `.env` and configure a regular file URL such as `DATABASE_URL="file:./data/binvault.db"`. Confirm the chosen database is genuinely new.
3. Build against a **separate disposable migrated SQLite database**, never against the intended installation DB. Create a unique directory under the OS temporary directory, set `DATABASE_URL="file:/absolute/temp/path/build.db"`, run `npm run production:init` and `npx prisma migrate deploy` on that temporary path, then `npm run build`. Restore the installation `DATABASE_URL` and delete the temporary build directory when done. The supported build uses `next build --webpack` and bundled local Geist Sans/Mono Latin assets. These two assets came from the installed Next.js package and are redistributed with the Geist project's SIL Open Font License notice in `app/fonts/OFL.txt`; no Google Fonts request is needed during build. Package installation is the build's only intended network requirement.
4. Run `npm run production:check` using the **installation** `DATABASE_URL`. It reports a fresh installation without creating the database.
5. With BinVault stopped, run `npm run production:init` to create a new **empty** SQLite file only after fresh preflight, then run `npx prisma migrate deploy` explicitly against the installation URL and `npm run production:ready`. The initializer refuses an existing database and performs no migration or seed.
6. Run `npm run production:start`, check `GET /api/health` (process alive) and `GET /api/ready` (installation ready), then use Settings for first-run locations, container types, and categories. Do not seed automatically.

Never use an ignored local `dev.db` as an implicit production target. Check the environment selected for every migration command. The database URL accepts `file:./...`, `file:../...`, and `file:/...` regular files; memory databases, query/fragment options, and symlinked database files are unsupported.

## Existing-install update

1. While the single running app is healthy, create and retain a BinVault backup outside the installation. See [Backup and recovery](BACKUP_RECOVERY.md). Stop **every** BinVault process before migration or restore.
2. Install the new code, run `npm ci`, `npx prisma generate`, and build against a disposable migrated DB as above. Preserve the existing DB, uploads, recovery storage, and environment configuration.
3. Run `npm run production:check` against the existing DB. It checks read-only SQLite integrity, migration history, the unsupported pre-v1 `Item` table, required paths, SQLite sidecars, recovery state, and permissions. If it fails, do not migrate. Resolve an interrupted restore using the documented stopped-app recovery procedure.
4. Explicitly run `npx prisma migrate deploy`; if it fails, leave BinVault stopped. Do not reset or seed. Investigate the failed migration or use the pre-update backup.
5. Run `npm run production:ready`, then `npm run production:start`. Verify `/api/ready`, inventory, and media.

Preflight permits a genuinely fresh missing DB and a valid prefix of pending migrations from a supported installation. It rejects the old experimental `Item` schema because the historical inventory migration drops that table without copying rows. That database is **not** an automatic v1 upgrade; export legacy data manually before starting from a supported baseline. Do not bypass `production:check`. Readiness requires all migrations and rejects a missing DB, failed or divergent history, or an unresolved restore marker. Neither check writes, repairs, or creates the installation DB.

## Recovery and rollback

If a new release has no database migration, reverting only application code may be enough when schema compatibility permits. After a DB migration, older code may be incompatible with the new schema. Restore the matched DB **and media** from the pre-update backup while all processes are stopped, using [Backup and recovery](BACKUP_RECOVERY.md); retain its automatic pre-restore safety ZIP. Never delete a SQLite `-wal`, `-shm`, or `-journal` file merely to force a check or restore: it may hold committed state. An unresolved `.binvault-recovery/restore-state.json` blocks startup and readiness until the documented recovery operation succeeds or an operator resolves it safely.

## Files and permissions

The BinVault account needs read/write access to the SQLite file and parent (journals and renames), `public/uploads`, an existing `.binvault-recovery` directory, and the OS temporary directory (backup staging). If recovery storage is absent, its parent must be writable so recovery commands can create it when needed. Existing production paths should be regular directories/files, not symlinks. Repository source and Prisma migrations need only read access at runtime; `.next` must be writable during build. Readiness uses metadata and read-only DB queries rather than write probes. Treat backup and recovery storage as private operator data. HTTP probes return status and package version only, never absolute paths or the database URL.

## Probes and process behavior

`GET /api/health` returns HTTP 200 with process liveness and the current `package.json` version; it does not inspect database or disk. `GET /api/ready` returns HTTP 200 when the configured database, complete migration history, uploads, temporary directory, and recovery state are usable; otherwise HTTP 503 with stable check names. Neither endpoint returns internal paths, secrets, or exception details. `production:start` performs the same post-migration check before launching `next start`, does not migrate or seed, and forwards termination signals to the Next process. Foreground operation is the v1 baseline; this milestone does not implement Docker, PM2, systemd, or launchd configurations.
