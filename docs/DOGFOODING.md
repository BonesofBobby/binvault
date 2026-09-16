# Private home RC dogfooding

Keep the production installation separate from development. Keep multiple backups outside it. Follow [Production operation](PRODUCTION.md) and [Backup and recovery](BACKUP_RECOVERY.md).

1. **Installation:** verify `production:ready`, health/readiness, version, first backup, and a stopped-app recovery drill on a disposable installation.
2. **One-room pilot:** create Locations, Container Types, an optional Category, Containers, and a few real items. Check first-run friction.
3. **Mixed records:** try standard, asset, consumable, and document metadata plus inventory photos. Document metadata is not document file upload.
4. **Retrieval and changes:** search, find an item, edit and move it, then exercise safe deletion with disposable sample entries.
5. **Mobile:** use a phone on a trusted private network to add/search/edit while moving through the pilot room.
6. **Review:** check dashboard attention/insights and Activity & History against actual changes.
7. **Whole home:** expand room by room; make and validate backups regularly, keeping a second copy elsewhere.
8. **Update simulation:** test the next RC on disposable DB/media copies, back up live data, stop the app, and follow the explicit update workflow.

Issue note template: RC version; date; area/workflow; steps; expected; actual; severity; data-safety impact; workaround; friction/UX observation; performance observation. Do **not** put household addresses, photos, serial numbers, documents, backup archives, or other sensitive home inventory into public GitHub issues.
