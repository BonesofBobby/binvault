# BinVault v1.0 Security and Runtime Baseline

This document records the security boundary reviewed on September 1, 2026. It
is intentionally limited to the current local/private BinVault deployment.

## Supported deployment model

BinVault v1.0 is a single-user, local/private application. It has no
authentication or authorization layer. Run it on a trusted computer and bind it
to loopback, or restrict access to a trusted private network with host/network
controls. Do not expose this version directly to the public internet. A broader
deployment model requires later authentication and application-security work.

## Runtime

- Dependency floor: Next.js requires Node `20.9.0`; Prisma is the tighter
  constraint at Node `20.19.0`, `22.12.0`, or `24.0.0` on its supported lines.
- Minimum supported BinVault Node.js: `22.12.0`. Node 20 meets the dependency
  floor but is end-of-life, so it is not part of the v1.0 support baseline.
- Recommended Node.js: Node 24 LTS, selected by `.nvmrc`.
- Minimum npm: npm 10. The reviewed toolchain is npm `11.17.0`, declared in
  `package.json` for reproducible lockfile work.

Use `npm ci` with the committed lockfile for review and release builds. Run
`npm audit` during release preparation and after dependency changes. Findings
must be assessed by dependency path and actual exposure; do not use forced or
major-version audit fixes without compatibility review.

## Dependency audit

The pre-change audit reported 18 vulnerable packages: 14 high, 4 moderate, and
0 critical. Next.js `16.2.10` was a direct production finding and brought
vulnerable PostCSS and Sharp versions into the production/build path. Updating
Next.js and its matching ESLint config to `16.3.4`, followed by compatible
transitive lockfile resolution, reduced the audit to 7 packages: 4 high,
3 moderate, and 0 critical.

The remaining high findings all originate in the Prisma CLI package. BinVault's
application runtime uses `@prisma/client`, the SQLite adapter, and
`better-sqlite3`; it does not import `@prisma/config`, `@prisma/dev`,
`deepmerge-ts`, or `mysql2`, and it does not connect to MySQL. The CLI is used
for schema validation, client generation, and migrations in trusted local
development/release workflows.

| Audit finding | Advisory and affected path | Exposure and fix decision | v1.0 blocker |
| --- | --- | --- | --- |
| `deepmerge-ts` (high) | Recursive-object stack exhaustion, GHSA-ggr8-5vv4-36mx; `prisma > @prisma/config > deepmerge-ts` | Prisma configuration tooling only. npm offers only a Prisma 7 to 6 downgrade, which is incompatible with the current schema/toolchain. Avoid untrusted Prisma config input and revisit when Prisma publishes a compatible update. | No for trusted local/private use |
| `@prisma/config` (high) | Aggregate finding inherited from `deepmerge-ts`; `prisma > @prisma/config` | Same tooling-only exposure and incompatible downgrade suggestion as above. It is not loaded by the BinVault server request path. | No for trusted local/private use |
| `mysql2` (high) | Cleartext credential leak through auth-plugin downgrade, GHSA-3f6p-5ww8-9rcr; `prisma > mysql2` | Bundled with the Prisma CLI, but BinVault supports SQLite only and never creates a MySQL connection. npm offers only the incompatible Prisma downgrade. | No; affected database API is unused |
| `prisma` (high, direct) | Aggregate finding inherited from `@prisma/config`, `@prisma/dev`, and `mysql2`; root `prisma` dependency | CLI/release tooling exposure only; the production request path uses `@prisma/client`. Retained at 7.8.0 because npm's suggested 6.19.3 change is a major downgrade, not a safe patch. | No for trusted local/private use |

The three remaining moderate findings are also below `prisma > @prisma/dev`
(`@hono/node-server` and `valibot`, plus the aggregate `@prisma/dev` finding).
BinVault does not start that development server or pass it untrusted requests.
They are accepted on the same local-tooling basis until Prisma supplies a
compatible dependency update.

## Legacy database decision

The migration `20260708050902_inventory_schema` drops the experimental `Item`
table and creates `InventoryItem` without copying rows. A representative
pre-migration database with an `Item` row therefore loses that row when the
migration is applied.

This is **Option A: not a supported upgrade path**. Repository history shows
that the legacy schema and seed preceded the inventory redesign, while both the
destructive migration and the replacement `InventoryItem` seed preceded the
first `v1.0.0` tag. No supported BinVault release used the legacy `Item` table.
BinVault v1.0 support starts from the current migration chain/current schema;
pre-v1 experimental databases containing `Item` rows are not automatically
upgradeable. Back up and manually export any such data before starting from the
supported baseline. The already-applied historical migration is not rewritten.

Databases already past `20260708050902_inventory_schema` remain on the supported
upgrade path and can apply later migrations normally.
