# BinVault Software Requirements Specification

## 1. Project Overview

BinVault is a local-first storage inventory application designed to help users catalog household storage containers, track the items inside them, and generate printable QR-code labels. The goal is to allow users to scan a container label and instantly view the bin number, location, and contents without needing to open the container.

## 2. Project Purpose

The purpose of BinVault is to solve a common household organization problem: not knowing what is stored inside bins, totes, boxes, or containers without physically opening them.

The application will also serve as a professional portfolio project demonstrating full-stack development, database design, QR-code generation, local data management, and future self-hosted deployment.

## 3. Target Users

- Homeowners
- Families
- Garage/storage organizers
- People using bins, totes, attic storage, or closet storage
- Future self-hosted/private-cloud users

## 4. Core Features

### 4.1 Dashboard

The dashboard shall display:
- Total number of containers
- Total number of stored items
- Recently updated containers
- Quick search

### 4.2 Container Management

Users shall be able to:
- Create a container
- View all containers
- Edit container details
- Delete a container
- Search containers
- Filter containers by location or category

Each container shall include:
- Bin number
- Name
- Location
- Container type
- Description
- Notes
- Created date
- Updated date

### 4.3 Item Management

Users shall be able to:
- Add items to a container
- Edit item details
- Delete items
- View all items inside a container

Each item shall include:
- Item name
- Quantity
- Category
- Condition
- Notes

### 4.4 QR Code Generation

The system shall generate a QR code for each container.

The QR code shall contain:
- Bin number
- Container name
- Location
- Contents list

The QR code should work offline by storing readable text directly inside the QR code.

### 4.5 Printable Labels

The system shall provide a printable label view containing:
- QR code
- Bin number
- Container name
- Location
- Short contents preview

## 5. Version 1 Scope

Version 1 will include:
- Local Next.js application
- SQLite database
- Container CRUD
- Item CRUD
- QR-code generation
- Printable labels
- Basic search/filtering

Version 1 will not include:
- User login
- Cloud sync
- Mobile camera scanning
- Photos
- Barcode scanning
- Multi-user permissions

## 6. Future Enhancements

Future versions may include:
- Photo uploads
- Attachment uploads
- User authentication
- Home server deployment
- Docker support
- PostgreSQL database
- Mobile-friendly PWA
- Barcode scanning
- Import/export to Excel
- Insurance inventory module
- Maintenance reminders

## 7. Technical Stack

- Framework: Next.js
- Language: TypeScript
- Styling: Tailwind CSS
- Database: SQLite
- ORM: Prisma
- QR Code Library: qrcode
- Deployment Future: Docker / home server / NAS

## 8. Database Entities

### Container

Fields:
- id
- binNumber
- name
- location
- containerType
- category
- description
- notes
- createdAt
- updatedAt

### Item

Fields:
- id
- containerId
- name
- quantity
- category
- condition
- notes
- createdAt
- updatedAt

## 9. User Stories

- As a user, I want to create a storage container so I can track what is inside it.
- As a user, I want to add items to a container so I know the contents without opening it.
- As a user, I want to generate a QR code so I can scan a bin and see its contents.
- As a user, I want to print labels so I can attach them to physical bins.
- As a user, I want to search for an item so I can quickly find where it is stored.

## 10. Portfolio Value

BinVault demonstrates:
- Full-stack application design
- Database modeling
- CRUD functionality
- QR-code generation
- Local-first architecture
- Practical user-centered software design
- Future-ready deployment planning