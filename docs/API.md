# BinVault API Design

## Overview

BinVault uses server-rendered pages and Next.js server actions for current
container and inventory management. Internal JSON API routes are used only
where browser-side behavior requires them, currently search and inventory
media operations.

## Base API Path

`/api`

---

## Container Management

Container management uses server actions rather than public JSON endpoints.

Implemented user workflows:

- List and view containers
- Create a container using an existing location and container type
- Edit container information without changing associated inventory
- Delete an empty container after explicit confirmation

Container deletion is blocked when one or more inventory records remain. The
user must resolve those records before the container can be deleted; BinVault
does not cascade-delete inventory or media through the container-management
workflow.

Location and container-type administration are not part of this workflow.

---

## Search

### Universal Search

```text
GET /api/search?query=hdmi
```

Supported query parameters:

- `query` or `q`: search text
- `limit`: maximum result count
- `entityTypes`: comma-separated inventory, container, location, or category
  entity types

The response contains ranked results, grouped results, the normalized query,
the total match count, and a generation timestamp.

---

## Inventory Media

### List Inventory Media

```text
GET /api/inventory/:id/media
```

Returns media metadata and public URLs for one inventory record.

### Upload Inventory Photo

```text
POST /api/inventory/:id/media
```

Accepts multipart form data containing an image file and an optional caption.

### Delete Media

```text
DELETE /api/media/:id
```

Deletes one media record and its stored file.

---

## Inventory Lifecycle

Inventory movement and full-record deletion use server actions rather than
public JSON endpoints.

Implemented user workflows:

- View an item's current container and choose a different existing container
- Move only the inventory record while preserving its category, metadata,
  quantity, and media
- Review the number of associated media files before deletion
- Permanently delete an inventory record after explicit confirmation

Move destinations are validated again on the server. The current container is
not an eligible destination, and a container that no longer exists is rejected
without changing the inventory record.

Full-record deletion coordinates Prisma and the configured `StorageProvider`.
The service reads the media paths owned by the item and deletes the inventory
record in a database transaction; Prisma then removes its media records through
the existing relation. Only after that transaction commits does the service
attempt to delete those recorded files. This order prevents a failed database
operation from leaving media records that point to files already removed from
storage.

Database and file storage cannot share one atomic transaction. If one or more
file deletions fail after the database commit, the inventory record remains
deleted and the user receives a cleanup warning containing only a failure
count, never internal file paths. A future reconciliation job should identify
and remove such orphaned files; Phase 1 does not introduce a background queue.

---

## Planned API Areas

There are currently no JSON endpoints for container CRUD, full inventory CRUD,
inventory movement, inventory deletion, locations, categories, container types,
QR labels, documents, or maintenance. Future endpoints should be added here
only after they are implemented.
