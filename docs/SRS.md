# BinVault requirements and RC scope

This document replaces the development-era concept specification that treated QR labels as a v1 requirement. For the exact candidate see [1.0.0-rc.2 notes](releases/v1.0.0-rc.2.md). QR remains future work.

## Purpose and deployment

BinVault answers what a household owns, where it is kept, and what activity occurred. The first private production candidate runs locally with one trusted operator, one Node process, SQLite, and filesystem photo media. Authentication, public Internet exposure, and multi-user deployment are unsupported.

## Required and implemented in 1.0.0-rc.2

- Manage hierarchical Locations, reusable Container Types, optional Categories, and Containers with guarded deletion.
- Create, view, edit, move, and safely delete STANDARD_ITEM, ASSET, CONSUMABLE, and DOCUMENT inventory records. The latter three carry metadata; they are not complete asset/maintenance/document management workflows.
- Upload/delete inventory photos, search inventory/containers/locations/categories, and review dashboard summaries, attention, insights, and Activity & History.
- Provide a responsive desktop/mobile shell.
- Create portable backups, validate them, and perform stopped-app restore/recovery with a pre-restore safety backup.
- Support production check/init/ready/start, health/readiness probes, and Node 22/24 CI.

## Deferred requirements

QR generation/scanning/labels, notifications, maintenance schedules/history, document file uploads/center, non-photo attachments, advanced reports/export, bulk operations, pagination, offline PWA, cloud storage/sync, scheduled/encrypted backups, live restore, and distributed deployment require separate milestones.

## Operational constraints

SQLite and filesystem media are not one atomic transaction. Backup coordination covers only this app process; an interruption can leave orphaned media. ZIPs are bounded by file/size/ratio limits. Restore requires every BinVault process stopped. Keep backups outside the installation and test recovery on disposable copies.
