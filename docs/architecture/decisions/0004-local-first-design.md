# ADR-0004: Adopt a Local-First Design

## Status

Accepted

## Context

BinVault is intended to store personal household information, including:

- Inventory
- Storage locations
- Serial numbers
- Receipts
- Manuals
- Insurance records
- Important documents

The user wants to retain ownership and control of this information and eventually host the application on a private family home server.

## Decision

BinVault will be designed as a local-first application.

The initial version will run on the user’s laptop with local storage. Future versions will support deployment to a private home server or NAS.

Core household functionality should not depend on public cloud services or continuous internet access.

## Consequences

### Benefits

- User retains control of personal data
- Core features work without internet access
- Lower dependence on third-party services
- Suitable for private home-server deployment
- Aligns with the original product vision

### Trade-offs

- Remote access requires user-managed infrastructure
- Backups must be intentionally designed
- Multi-user synchronization will be more complex
- Some future integrations may require optional internet connectivity