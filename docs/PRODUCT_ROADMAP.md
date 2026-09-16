# BinVault product roadmap

Updated September 2026. Earlier development plans used 1.0 for the foundation and 1.1 for Dashboard Intelligence; those labels were planning milestones, not current production tags. The first private production candidate was **1.0.0-rc.1**; **1.0.0-rc.2** is the current candidate for continued private home dogfooding.

## Implemented in the RC

Locations with hierarchy, Container Types, optional Categories, container and inventory lifecycle, standard-item and asset/consumable/document metadata, inventory photos, search, dashboard insights, Activity & History, responsive desktop/mobile shell, portable backups, stopped-app recovery, production checks/probes, and Node 22/24 CI.

## Next candidates

- QR labels, printing, and scanning.
- Maintenance scheduling/history and notifications.
- Document file uploads and a document center; asset/document metadata alone does not provide these workflows.
- Advanced reports/export, bulk actions, pagination, and media reconciliation.

## Longer-term possibilities

Authentication, multi-user collaboration, public deployment, offline PWA, cloud sync/storage, scheduled/encrypted backups, and AI-assisted workflows need separate design and release decisions. See [feature backlog](FEATURE_BACKLOG.md) for unscheduled ideas and [current RC scope](releases/v1.0.0-rc.2.md) for current limits.
