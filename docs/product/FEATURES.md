# BinVault features (1.0.0-rc.2)

| Area | Implemented now | Future/unsupported |
| --- | --- | --- |
| Reference data | Hierarchical Locations, Container Types, optional Categories; Settings bootstrap | Multi-user administration |
| Containers | Create, list/detail, edit, guarded empty-container delete | Container photo workflow, QR labels |
| Inventory | Standard items; asset, consumable, and document **metadata**; create/detail/edit/move/safe delete | Maintenance, full asset/document management, bulk/pagination |
| Media | Inventory photo upload/delete (supported image types) | Document uploads and non-photo attachments |
| Discovery | Inventory/container/location/category search; dashboard insights, attention, recent activity | Advanced reports/export and saved searches |
| History | Append-only Activity & History for supported mutations | User attribution, notifications |
| Operations | ZIP backup/validation, stopped-app restore/recovery, production checks/init/ready/start, health/readiness, Node 22/24 CI | Scheduled/encrypted/cloud backups, live restore, multi-process deployment |
| Platform | Responsive desktop/mobile shell; local/private single operator | Authentication, public Internet, offline PWA, cloud sync |

See [release notes](../releases/v1.0.0-rc.2.md) and [backlog](../FEATURE_BACKLOG.md). This replaces an older development-era feature table whose planned statuses no longer matched the application.
