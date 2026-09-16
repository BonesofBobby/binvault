# BinVault

BinVault tracks household inventory, containers, assets, documents, media, and activity. V1 runs as one local/private Node.js process with SQLite and filesystem uploads. It has no authentication; do not expose it directly to the public internet.

For a production installation or update, follow [Production operation](docs/PRODUCTION.md). For portable backups and stopped-app restore, follow [Backup and recovery](docs/BACKUP_RECOVERY.md). The [security baseline](docs/SECURITY_BASELINE.md) records supported runtime and legacy-database limits.

Node 24 LTS and npm 11.17.0 are recommended; Node 22.12+ remains in the supported engine range. Install locked dependencies with `npm ci`. The v1 production build uses Webpack and bundled Geist fonts, so it does not fetch fonts at build time. Start with `npm run production:start` only after explicit migration and readiness checks.

For development, configure a file-backed SQLite `DATABASE_URL`, run `npm ci` and `npx prisma generate`, apply `npx prisma migrate deploy` to a **development-only** database, and run `npm run dev`. The committed `.env.example` is a non-secret starting point. Set up locations, container types, and categories in Settings before adding containers. Do not run migration, seed, or restore commands against a database without checking the selected `DATABASE_URL` first.

Validation commands: `npm run test:run`, `npm run lint`, `npx tsc --noEmit`, and `npx prisma validate`.
