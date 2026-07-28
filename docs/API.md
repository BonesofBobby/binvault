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

## Planned API Areas

There are currently no JSON endpoints for container CRUD, inventory CRUD,
locations, categories, container types, QR labels, documents, or maintenance.
Future endpoints should be added here only after they are implemented.
