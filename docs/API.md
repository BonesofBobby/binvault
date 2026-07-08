# BinVault API Design

## Overview

BinVault uses internal API routes to manage containers, items, locations, categories, container types, search, and QR label generation.

## Base API Path

/api

---

## Containers

### Get All Containers

GET /api/containers

Returns all containers with location, container type, and item count.

### Get One Container

GET /api/containers/:id

Returns one container and all items inside it.

### Create Container

POST /api/containers

Request body:

{
  "binNumber": "BIN-GARAGE-001",
  "name": "Electrical Supplies Tote",
  "description": "Clear tote with cables and electrical supplies",
  "notes": "Stored on garage shelf A",
  "locationId": 1,
  "containerTypeId": 1
}

### Update Container

PUT /api/containers/:id

### Delete Container

DELETE /api/containers/:id

---

## Items

### Create Item

POST /api/items

Request body:

{
  "containerId": 1,
  "name": "HDMI Cable",
  "quantity": 4,
  "categoryId": 1,
  "condition": "Good",
  "notes": "Various lengths"
}

### Update Item

PUT /api/items/:id

### Delete Item

DELETE /api/items/:id

---

## Locations

### Get Locations

GET /api/locations

### Create Location

POST /api/locations

Request body:

{
  "name": "Garage Shelf A",
  "parentId": 1
}

---

## Container Types

### Get Container Types

GET /api/container-types

### Create Container Type

POST /api/container-types

Request body:

{
  "name": "Plastic Tote"
}

---

## Categories

### Get Categories

GET /api/categories

### Create Category

POST /api/categories

Request body:

{
  "name": "Electronics"
}

---

## Search

### Search Containers and Items

GET /api/search?q=hdmi

Returns matching containers and items.

Example result:

{
  "containers": [],
  "items": [
    {
      "id": 1,
      "name": "HDMI Cable",
      "quantity": 4,
      "container": {
        "binNumber": "BIN-GARAGE-001",
        "name": "Electrical Supplies Tote",
        "location": "Garage Shelf A"
      }
    }
  ]
}

---

## QR Labels

### Get QR Data

GET /api/containers/:id/qr

Returns QR-ready text for offline label generation.

Example:

BIN-GARAGE-001
Electrical Supplies Tote
Location: Garage Shelf A

Contents:
- HDMI Cable x4
- Ethernet Cable x8
- USB-C Charger x2

### Future Smart QR

Future versions may support QR codes that link to:

/containers/:id

instead of embedding full container contents.