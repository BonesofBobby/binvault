# BinVault Database Design

## Overview

BinVault uses a relational SQLite database managed through Prisma ORM.

The database is designed around household inventory. Containers organize inventory, locations identify where containers are stored, and categories and inventory types provide consistent classification.

---

## Entity Relationships

```text
Location
  └── contains many Containers

ContainerType
  └── classifies many Containers

Container
  ├── belongs to one Location
  ├── belongs to one ContainerType
  └── contains many InventoryItems

Category
  └── classifies many InventoryItems

InventoryItem
  ├── belongs to one Container
  ├── may belong to one Category
  └── has one InventoryType

## Application Events

`Event` is the durable application-history model used by entity history and
Dashboard Recent Activity. It stores stable machine-readable event and entity
types, a string entity ID when available, a human-readable summary, bounded JSON
metadata, actor identity fields, and a creation timestamp.

Events intentionally have no foreign keys to inventory, containers, media, or
users. History therefore remains readable after a domain entity is deleted, and
future authenticated actor IDs can be represented without a current `User`
table. Normal application services treat events as append-only; BinVault exposes
no event update or deletion workflow.

Reads use `createdAt DESC, id DESC` for deterministic ordering. Event metadata is
curated historical context rather than a serialized database record. It must not
contain binary data, secrets, environment data, or absolute filesystem paths.

Reference-data create, edit, and delete operations for Locations, Container
Types, and Categories record Events transactionally. Event rows retain string
entity identifiers without foreign keys so deletion history remains readable.

## Reference Data Integrity

Locations may form a simple parent/child hierarchy. Service validation prevents
self-parenting and cycles. Locations with child locations or containers,
Container Types with containers, and Categories with inventory items cannot be
deleted. These restrictions intentionally preserve user data rather than
cascading or silently clearing relationships.
