# Changelog

## Unreleased

## 1.0.0-rc.2 - 2026-09-16

### Fixed

- Corrected a release-blocking dark-theme foreground/contrast defect discovered during rc.1 dogfooding by declaring the semantic dark theme at the application root.
- Added regression coverage protecting the root dark-theme contract so inherited foreground tokens remain readable on BinVault's dark interface.

### Release compatibility

- No schema, migration, data-model, backup-format, restore-protocol, or production-storage changes from rc.1.
- Rc.2 supersedes rc.1 for continued private home dogfooding.


## 1.0.0-rc.1 - 2026-09-15

### Added

- Inventory foundation with standard items, asset/consumable/document metadata, detail, edit, move, and guarded delete; hierarchical Locations, Container Types, optional Categories, and container management.
- Search, dashboard intelligence, responsive desktop/mobile shell, and append-only Activity & History.
- Inventory photo upload/delete, portable ZIP backup and validation, stopped-app restore/recovery with an automatic pre-restore safety backup.
- Production preflight, guarded empty DB initialization, readiness/start commands, health/readiness endpoints, and independent Node 22/24 CI verification.

### Changed

- Production commands now share a single `.env.production` or shell `DATABASE_URL` policy; the example points to a private production DB rather than `dev.db`.

### Reliability and security/operations

- Coordinated application mutations and database snapshots; checked archive paths, manifests, checksums, size limits, SQLite integrity, and migration compatibility.
- Added a documented local/private deployment boundary, dependency-audit disposition, and release validation checklist.

### Known limitations

- SQLite and filesystem media cannot form one atomic transaction; interruption can leave orphaned files. Backups coordinate only one app process. Restore requires BinVault stopped and archives are bounded by validation limits.
- No authentication, multi-user or public Internet support, QR, notifications, maintenance workflows, document uploads, bulk/pagination, offline PWA, cloud storage, scheduled/encrypted backups, or live restore.
