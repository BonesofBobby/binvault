# BinVault UI Wireframes

## 1. Dashboard

Purpose: Give the user a quick overview of their storage system.

Elements:
- App title: BinVault
- Search bar: “Search for an item, bin, or location…”
- Total containers card
- Total items card
- Recently updated containers
- Quick actions:
  - Add Container
  - Print Labels
  - View All Containers

Layout:

[BinVault]

Search...

[Total Containers] [Total Items] [Locations]

Recently Updated
- BIN-GARAGE-001 — Electrical Supplies
- BIN-HOLIDAY-001 — Christmas Lights

---

## 2. Containers Page

Purpose: Show all containers and allow filtering.

Elements:
- Search/filter bar
- Location filter
- Container type filter
- Container cards

Each card:
- Bin number
- Container name
- Location
- Item count
- Open button

---

## 3. Add Container Page

Fields:
- Bin number
- Container name
- Location
- Container type
- Description
- Notes

Buttons:
- Save Container
- Cancel

---

## 4. Container Detail Page

Purpose: View and manage one container.

Elements:
- Bin number
- Name
- Location
- Container type
- Notes
- Items table
- Add item button
- Generate QR Label button
- Print Label button

Item table:
- Item name
- Quantity
- Category
- Condition
- Notes

---

## 5. Search Page

Purpose: Find where an item is stored.

Elements:
- Search input
- Results grouped by:
  - Items
  - Containers
  - Locations

Example result:
HDMI Cable
Quantity: 4
Found in: BIN-GARAGE-001 — Electrical Supplies Tote
Location: Garage Shelf A

---

## 6. QR Label Page

Purpose: Generate a printable label.

Elements:
- QR code
- Bin number
- Container name
- Location
- Contents preview
- Print button

QR Modes:
- Offline QR: stores readable contents directly in the QR code
- Smart QR: future mode that links to the live container page

---

## 7. Print Center

Purpose: Print multiple labels at once.

Elements:
- Select containers
- Label size option
- Preview labels
- Print selected labels

---

## 8. Settings

Purpose: Manage reusable system data.

Sections:
- Locations
- Container types
- Categories
- QR mode preference
- Backup/export options