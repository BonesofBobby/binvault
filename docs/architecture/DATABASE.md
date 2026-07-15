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