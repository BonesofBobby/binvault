# ADR-0003: Use an Inventory-First Domain Architecture

## Status

Accepted

## Context

The original BinVault concept centered on storage containers and QR labels.

As the product evolved, it became clear that users primarily care about finding and understanding what they own. Containers are important, but they are an organizational mechanism rather than the main subject of the system.

The product also needs to support:

- Standard household items
- Valuable assets
- Consumables
- Documents
- Search
- Photos
- Receipts
- Maintenance records
- Insurance information

## Decision

Inventory will be the central domain concept in BinVault.

The system will model inventory entries using a flexible `InventoryItem` entity with these types:

- Standard Item
- Asset
- Consumable
- Document

Containers, locations, categories, documents, QR labels, and maintenance records will support and enrich inventory.

## Consequences

### Benefits

- Better support for global search
- Easier expansion into assets and documents
- Consistent user experience
- Reduced need for separate disconnected modules
- Stronger long-term architecture

### Trade-offs

- Inventory forms may require conditional fields
- Some inventory types will have unused optional fields
- The user interface must keep the model understandable