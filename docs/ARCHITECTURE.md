# BinVault Architecture

## Overview

BinVault is a local-first, full-stack web application designed to help users organize household storage containers, generate QR-code labels, and quickly locate stored items.

The application is intentionally designed to support future migration to a self-hosted home server without requiring significant architectural changes.

---

# Architecture Philosophy

BinVault follows four design principles:

1. Local First
2. Offline Friendly
3. Modular Design
4. Future Cloud Ready

The application should always function without an Internet connection.

---

# High-Level Architecture

┌─────────────────────────────┐
│        Browser UI           │
│       (Next.js React)       │
└──────────────┬──────────────┘
               │
               │
┌──────────────▼──────────────┐
│        API Routes           │
│     Business Logic Layer    │
└──────────────┬──────────────┘
               │
               │ Prisma ORM
               │
┌──────────────▼──────────────┐
│        SQLite Database      │
└──────────────┬──────────────┘
               │
               │
     QR Generator / File Storage

---

# Technology Stack

Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

Backend
- Next.js API Routes

Database
- SQLite
- Prisma ORM

Future
- PostgreSQL
- Docker
- NAS Deployment
- Mobile PWA

---

# Core Modules

Dashboard

Displays:

- Total containers
- Total items
- Search
- Recently updated

---

Storage Module

Responsible for:

- Containers
- Items
- Locations
- Categories
- Container Types

---

QR Module

Responsible for:

- QR generation
- Printable labels
- Future Smart QR support

---

Search Module

Allows searching by:

- Item
- Container
- Location
- Category

---

Future Modules

Insurance Inventory

Maintenance Tracking

Warranty Tracking

Document Storage

Photo Library

---

# Database Philosophy

The database is normalized to eliminate duplicate data.

Relationships:

Location
    └── Containers
            └── Items
                    └── Categories

Container Types are reusable lookup values.

Locations support future nested hierarchies.

---

# Deployment Roadmap

Version 1
- Local laptop

Version 2
- Docker

Version 3
- Home Server

Version 4
- Family Cloud

---

# Security

Version 1

No authentication

Local-only database

Version 2

User authentication

Role-based access

Encrypted backups

HTTPS

---

# Long-Term Vision

BinVault will evolve from a storage inventory application into a complete household asset management platform capable of tracking storage, insurance documentation, maintenance schedules, warranties, manuals, and family-owned assets.