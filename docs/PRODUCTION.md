# Production operation (1.0.0-rc.2)

BinVault is a local/private, single-operator, single-process application. It has no authentication. Bind it to loopback or restrict access to a trusted private network; do not expose it to the public Internet. Use Node 24 LTS and npm 11.17.0; fresh-install CI also verifies Node 22.12+.

## One database target

Use a **separate production checkout** with its own `data/binvault.db` and `public/uploads`. Never copy `dev.db`, development uploads, or seed data into it. Copy `.env.example` to the ignored **`.env.production`** in that checkout. The example URL `file:./data/binvault.db` is resolved from the installation directory by BinVault and Prisma. Create `data/` as a regular private writable directory before preflight; `production:init` creates only the empty database file, not its parent. Keep the DB and uploads on persistent storage. Git ignores SQLite DB files and journal/WAL/shared-memory sidecars.

Production uses only `.env.production` or a shell `DATABASE_URL`. Shell values win. Remove `.env`, `.env.local`, and `.env.production.local` from the production checkout: production commands refuse them as ambiguous. A missing `DATABASE_URL` fails; there is no production fallback to `dev.db`. Next build/start, `production:*`, `recovery:restore`, `recovery:recover`, and Prisma CLI with `NODE_ENV=production` use the same Next-supported environment loader. `recovery:validate` is an offline archive check and needs no production DB configuration. Do **not** run a production migration with a bare `npx prisma migrate deploy`; use `NODE_ENV=production npx prisma migrate deploy`. Before every migration, backup, restore, build, or startup, check whether a temporary shell override is set and confirm the target installation. Never log or share the URL when it contains private information.

The URL must be a regular file-backed SQLite URL (`file:./...`, `file:../...`, or `file:/...`). In-memory URLs, query options, symlinked DB files, and missing parent directories are unsupported. Shell overrides are useful for a disposable build, but they must be unset before operating on production data.

Pages that read mutable inventory, container, dashboard, or reference data render from the runtime database. The build may use an empty disposable database without embedding its records in those pages; static navigation and other database-independent content can remain prerendered.

## First private home installation

1. Create the separate checkout and run `npm ci`, then `npx prisma generate`. Do not run seed, `db push`, or `migrate reset`.
2. Configure `.env.production`, create private writable `data/` and `public/uploads/`, and place backup storage **outside** the installation, ideally with a second copy on another device.
3. Build against a disposable migrated SQLite database, never the installation DB. Create a unique temporary directory with a writable `data/` parent; set a shell `DATABASE_URL="file:/absolute/temp/path/build.db"`; run `npm run production:check`, `npm run production:init`, `NODE_ENV=production npx prisma migrate deploy`, and `npm run build`. Unset the shell override and remove the disposable directory. The Webpack build uses bundled Geist fonts; `npm ci` is the intended network step.
4. With the production URL selected and BinVault stopped, run `npm run production:check`. It must report a fresh installation without creating a DB. Run `npm run production:init` (empty file only), `NODE_ENV=production npx prisma migrate deploy`, and `npm run production:ready`.
5. Run `npm run production:start`. Check `GET /api/health` and `GET /api/ready` for HTTP 200 and `1.0.0-rc.2`. In Settings create the first Location and Container Type; Category is optional. Create a Container, an Inventory item, and a first photo. Create, download, and validate the first backup. Keep that ZIP outside the installation.

`production:init` refuses an existing DB and never migrates or seeds. Preflight checks configuration, path permissions, recovery state, SQLite sidecars, integrity, and expected migration history. Readiness requires all migrations and a clean installation. The old experimental `Item` schema is not a supported automatic upgrade: its historical migration drops rows.

## Upgrade and rollback

Create and retain a backup **before every upgrade**. Stop every BinVault process before migration or restore. Where practical, test the new version and restore against disposable copies first. Preserve the existing `.env.production`, DB, uploads, and recovery storage while installing code. Run `npm ci`, `npx prisma generate`, build on a disposable migrated DB, `production:check`, explicit `NODE_ENV=production npx prisma migrate deploy`, `production:ready`, then `production:start`. Verify readiness, inventory, and media.

If migration fails, leave BinVault stopped; do not reset or seed. Application-code rollback after a migration may be schema-incompatible. Restore the matched DB **and media** from the retained backup using [Backup and recovery](BACKUP_RECOVERY.md). Restore requires stopped processes and creates a pre-restore safety backup. Never delete `-wal`, `-shm`, or `-journal` files just to pass preflight: they may hold committed state. An unresolved `.binvault-recovery/restore-state.json` blocks startup until recovery is resolved.

The BinVault account needs read/write permission to the DB and parent, `public/uploads`, recovery storage when present, and the OS temporary directory. `/api/health` reports process liveness and the package version; `/api/ready` reports installation checks. Neither exposes internal paths, secrets, or the database URL. `production:start` checks readiness, then launches `next start` and forwards stop signals. No Docker or service-manager configuration is supplied in this RC.
