# BinVault releases

## 1.0.0-rc.2 — private home release candidate

**Status:** Release candidate preparation. Rc.2 supersedes rc.1 for continued private home dogfooding after rc.1 exposed a dark-theme foreground/contrast defect. See [RC.2 notes](releases/v1.0.0-rc.2.md), [changelog](../CHANGELOG.md), and [release checklist](RELEASE_CHECKLIST.md).

Rc.2 retains the rc.1 product and production scope and changes the application root theme declaration so semantic foreground tokens correctly match BinVault's dark interface. It adds regression coverage for that contract. There are no schema, migration, data-model, backup-format, restore-protocol, or production-storage changes between rc.1 and rc.2.

## 1.0.0-rc.1 — published release candidate

**Status:** Tagged and published as a GitHub prerelease on September 16, 2026. Rc.1 established the first private/local production candidate and was subsequently superseded for dogfooding by rc.2 after the dark-theme contrast defect was discovered. See [RC.1 notes](releases/v1.0.0-rc.1.md).

## Historical artifact

An older annotated `v1.0.0` tag points to earlier repository history. Its existing GitHub Release contains unrelated CJEF release notes. It is **not** the current BinVault production v1 release. The owner will make a deliberate correction decision before a final v1.0.0 release.

The [v0.6.0 note](releases/v0.6.0.md) is development-era product history, not evidence of a published production release.

## Future directions

QR labels/scanning, maintenance workflows, document file upload/center, advanced asset/document workflows, reporting, collaboration, and cloud/offline capabilities remain future work. Older version numbers in historical plans are planning labels, not promised release tags or schedules.
