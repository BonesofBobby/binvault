# ADR-0002: Use Prisma ORM and SQLite for Initial Data Storage

## Status

Accepted

## Context

BinVault is designed as a local-first household information system.

The initial version needs:

- Simple local setup
- No external database server
- Relational data
- Type-safe database access
- Migrations
- Seed data
- A future path to PostgreSQL

## Decision

BinVault will use:

- Prisma ORM for database access
- SQLite for local development and initial household use
- Prisma migrations for schema changes
- Seed scripts for reproducible development data

## Consequences

### Benefits

- Simple local installation
- No database server required
- Type-safe queries
- Easy migrations
- Good development experience
- Future migration path to PostgreSQL

### Trade-offs

- SQLite is not ideal for high-concurrency multi-user use
- Production home-server deployment may eventually require PostgreSQL
- Prisma major-version changes may require adapter or configuration updates