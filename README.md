# BinVault

BinVault 1.0.0-rc.2 tracks household inventory, containers, asset/consumable/document metadata, photos, and activity. This release candidate runs as one local/private Node.js process with SQLite and filesystem uploads. It has no authentication; do not expose it directly to the public Internet.

For a first private home installation, follow [Production operation](docs/PRODUCTION.md). For portable backups and stopped-app restore, follow [Backup and recovery](docs/BACKUP_RECOVERY.md). The [RC notes](docs/releases/v1.0.0-rc.2.md), [changelog](CHANGELOG.md), [security baseline](docs/SECURITY_BASELINE.md), and [dogfooding plan](docs/DOGFOODING.md) record the current scope and limits.

Node 24 LTS and npm 11.17.0 are recommended; independent CI on Node 22 and 24 passed. Install locked dependencies with `npm ci`. The production build uses Webpack and bundled Geist fonts, so it does not fetch fonts at build time. Run explicit production migration and readiness checks before `npm run production:start`.

For development, use a **development-only** file-backed SQLite `DATABASE_URL` in `.env.local` or the shell. Run `npm ci`, `npx prisma generate`, `npx prisma migrate deploy` only against that development DB, and `npm run dev`. `.env.example` is now a production-specific template: copy it to `.env.production` only in a separate production checkout. Set up Locations and Container Types in Settings before adding Containers; Categories are optional. Never run seed, migration, backup, or restore without verifying the selected data target.

Validation commands: `npm run test:run`, `npm run lint`, `npx tsc --noEmit`, and `npx prisma validate`.

The bundled Geist font files in `app/fonts/` are covered by the Geist SIL Open Font License 1.1 notice in `app/fonts/OFL.txt`. BinVault currently has no project-level open-source license; a distribution/licensing decision is deferred.
