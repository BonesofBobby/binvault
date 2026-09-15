# Backup and recovery (v1)

BinVault backups are portable ZIP files. Each contains `manifest.json`, a consistent SQLite snapshot at `database/binvault.db`, and all regular files under BinVault's managed `public/uploads` tree at `media/<relative path>`. SHA-256 checksums and sizes are recorded for the database and each media file. The manifest includes useful record counts and warnings about database-referenced media missing from disk. Managed orphan files are included. The archive contains no environment variables, database URL, source code, or SQLite sidecars.

## Download and store a backup

While the single-process BinVault application is running, open **Settings → Backup & Recovery → Create backup**. Review the record/media summary and any missing-file warning, then choose **Download prepared ZIP** within 15 minutes. Keep copies outside the BinVault installation, ideally on another disk or machine. Missing referenced media is a warning, not a silent omission; inspect such warnings before relying on a backup. The download streams a staged ZIP. Allow enough free space for the database, media staging, and archive.

SQLite's backup API supplies a transactionally consistent database snapshot. The in-process maintenance gate waits for BinVault service mutations and blocks new ones while the snapshot and media staging are captured. SQLite and filesystem files are not one atomic resource; writes from other processes or direct filesystem changes are outside this protection. Multi-process and clustered operation require external coordination and are unsupported in v1.

## Validate

Run from the BinVault installation:

```sh
npm run recovery:validate -- /absolute/path/to/binvault-backup.zip
```

Validation does not replace live files. It checks archive entry paths/types/limits, a versioned manifest, all sizes and SHA-256 digests, SQLite integrity and foreign keys, record counts, media reconciliation, and Prisma migration names/checksums against this release. Only a compatible backup can be restored. Do not run validation on a machine without enough free temporary space for expanded files.

## Restore while stopped

Stop **every** BinVault/Next.js process first. Ensure the backup ZIP and `.binvault-recovery` directory are outside `public/uploads`. Use:

```sh
npm run recovery:restore -- /absolute/path/to/binvault-backup.zip --confirm-stopped
```

The flag records the operator's confirmation; it is not a process manager or distributed lock. Restore rejects any remaining SQLite `-wal`, `-shm`, or `-journal` sidecar until the application has shut down cleanly and they have been resolved. Never remove a WAL file merely to force restore: it may contain committed data.

The command first validates the candidate, creates and validates a **pre-restore safety backup** under `.binvault-recovery`, and stages the new database/media beside the live paths for rename-based swapping. It parks the original database/media, swaps the staged replacements, and verifies the installed data. If a swap or verification step fails, it attempts to restore parked originals. The safety ZIP remains after success; no automatic retention or deletion runs in v1. Cleanup failures after verification are reported as warnings and may leave parked files for manual inspection. Start BinVault only after the command reports success or a confirmed rollback, then inspect inventory and media.

## Interrupted restore

If a restore process exits between swaps, leave BinVault stopped. A `restore-state.json` marker under `.binvault-recovery` indicates incomplete work. Run:

```sh
npm run recovery:recover -- --confirm-stopped
```

This attempts to put parked originals back. Failed replacement files may remain beside the live paths with `.failed-<id>` suffixes for inspection. If recovery reports an incomplete rollback, do not start BinVault. Preserve the marker, parked files, and safety ZIP, and inspect them before manually repairing paths. Do not launch another restore until the marker is resolved.

## Limits and troubleshooting

V1 supports a local/private single-process installation with a regular file-backed SQLite database. It does not perform live web restore, distributed locking, scheduled/cloud/encrypted backups, or automatic retention. ZIP validation caps compressed archive size at 4 GiB, expanded data at 8 GiB, 10,000 files, 512 MiB per file, 2 MiB for the manifest, and compression ratio at 200:1. A backup exceeding these limits needs a later format/limit review; do not bypass validation.

If validation reports a checksum mismatch, archive corruption, incompatible migrations, or SQLite integrity failure, use another backup. If the safety backup cannot be created or validated, restore stops before touching live paths. If sidecars remain after a clean shutdown, investigate SQLite/WAL state rather than deleting them. Ensure sufficient free space on the filesystem containing the database and uploads: candidate sibling staging, parked originals, and the retained safety backup require additional space.
