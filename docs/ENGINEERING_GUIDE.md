# BinVault Engineering Guide

This document defines the engineering standards, architectural patterns, and development practices used throughout BinVault.

It complements `ARCHITECTURE.md`, which describes the system at a high level. This guide explains how features should be implemented inside the codebase.

---

# Engineering Objectives

BinVault should be developed as a production-quality application rather than a collection of isolated features.

The codebase should remain:

- Clear
- Modular
- Maintainable
- Type-safe
- Testable
- Secure by default
- Extensible
- Suitable for local and future hosted deployment

Every feature should improve the application without creating unnecessary coupling or forcing large rewrites later.

---

# Core Engineering Principles

## 1. Prefer Small, Focused Modules

Files and components should have a clear responsibility.

Avoid placing presentation logic, business rules, database queries, and storage operations in one large file.

Preferred structure:

```text
Page
  |
  v
Focused Server Component
  |
  v
Focused Client Component
  |
  v
Service
  |
  v
Prisma or Storage Provider
```

Large pages should be decomposed into reusable components when a section has its own data-loading or interaction responsibilities.

---

## 2. Keep Business Logic Out of UI Components

React components should focus primarily on:

- Rendering
- User interaction
- Form state
- Displaying feedback
- Calling server operations

Business rules should live in services.

Examples of business logic include:

- Validating supported file types
- Enforcing upload limits
- Calculating dashboard insights
- Determining whether maintenance is overdue
- Preventing invalid inventory moves
- Coordinating database and storage operations

---

## 3. Use Services for Application Workflows

Application services coordinate business operations.

Current service:

```text
lib/services/media-service.ts
```

Planned services may include:

```text
lib/services/dashboard-service.ts
lib/services/inventory-service.ts
lib/services/container-service.ts
lib/services/search-service.ts
lib/services/qr-service.ts
lib/services/document-service.ts
lib/services/maintenance-service.ts
```

A service should:

- Accept typed input
- Validate business rules
- Coordinate database operations
- Coordinate external or storage operations
- Return typed results
- Throw meaningful errors when an operation cannot be completed

Services should not contain user-interface code.

---

# Recommended Folder Responsibilities

## `app/`

Contains Next.js routes, pages, layouts, loading states, and API routes.

Responsibilities:

- Route handling
- Page composition
- Server-side data loading
- Request and response handling

Avoid placing reusable business logic directly inside route files.

---

## `components/`

Contains reusable user-interface components.

Recommended organization:

```text
components/
├── dashboard/
├── inventory/
├── storage/
├── layout/
└── ui/
```

Feature components should be grouped by domain when practical.

---

## `lib/services/`

Contains application-level business logic.

Examples:

- Media upload workflows
- Dashboard aggregation
- Inventory movement
- QR generation coordination
- Document management
- Maintenance scheduling

---

## `lib/storage/`

Contains storage abstractions and implementations.

Current files:

```text
lib/storage/storage-provider.ts
lib/storage/local-filesystem-storage-provider.ts
```

Future providers should implement the same storage interface without requiring major changes to the media service.

---

## `lib/db/`

Contains Prisma client configuration and database-related infrastructure.

Database client initialization should remain centralized.

---

## `prisma/`

Contains:

- Prisma schema
- Database migrations
- Seed data

Schema changes should be accompanied by a migration and reviewed for backward compatibility.

---

## `docs/`

Contains product, architectural, release, and engineering documentation.

Documentation should be updated when a feature changes the product direction or architecture.

---

# Server and Client Component Strategy

BinVault should use server components by default.

Server components are preferred for:

- Database queries
- Initial page data
- Secure server-side operations
- Reducing client-side JavaScript
- Composing data-driven pages

Client components should be used when the feature requires:

- Browser state
- Event handlers
- Forms
- File uploads
- Confirmation dialogs
- Dynamic notifications
- Interactive filtering
- Browser APIs

Client components must include:

```tsx
"use client";
```

only when client-side behavior is actually required.

---

# Server Wrapper Pattern

A server wrapper component may load data and pass it to a client component.

Example:

```text
Inventory Detail Page
        |
        v
InventoryMediaSection
Server Component
        |
        v
InventoryMediaGallery
Client Component
```

Use this pattern when it:

- Keeps the page smaller
- Separates data loading from interaction
- Avoids making an entire page a client component
- Produces a reusable feature boundary

---

# Data Access Rules

Prisma queries should generally occur in:

- Server components
- Services
- API routes when delegated through services

Prisma must not be imported into client components.

Prefer centralized service methods when a query represents reusable business behavior.

Direct Prisma access in a simple server page is acceptable when:

- The query is small
- The logic is page-specific
- No business rule is being duplicated
- The page remains readable

Move the logic into a service when complexity grows.

---

# API Route Standards

API routes should be used when a browser-side action requires a server operation.

Examples:

- File upload
- Media deletion
- Future QR generation
- Future document upload
- Interactive status updates

API routes should:

1. Validate route parameters.
2. Validate request data.
3. Call a service.
4. Return a consistent JSON response.
5. Use an appropriate HTTP status code.
6. Avoid duplicating service logic.
7. Avoid exposing internal stack traces.

Recommended response shapes:

```json
{
  "data": {}
}
```

or:

```json
{
  "error": "A clear user-facing error message."
}
```

---

# HTTP Status Code Guidance

Use status codes consistently.

```text
200 OK
Successful read, update, or deletion

201 Created
Successful resource creation

400 Bad Request
Malformed or invalid request data

404 Not Found
Requested resource does not exist

409 Conflict
Operation conflicts with existing data

413 Payload Too Large
Uploaded file exceeds the allowed limit

415 Unsupported Media Type
Unsupported file format

500 Internal Server Error
Unexpected server failure
```

---

# Error Handling

## Service Errors

Services should produce meaningful errors.

Examples:

- Inventory item not found
- Media record not found
- Unsupported file type
- File exceeds maximum size
- Storage operation failed
- Duplicate record detected

Avoid vague errors such as:

```text
Something went wrong
```

when a more specific message can be safely provided.

---

## API Error Handling

API routes should convert service failures into appropriate HTTP responses.

Unexpected internal details should be logged on the server but not exposed to the browser.

---

## UI Error Handling

The interface should:

- Show a clear message
- Explain what the user can do next
- Preserve form input when practical
- Avoid technical stack traces
- Distinguish errors from success messages

---

# TypeScript Standards

Use strict, meaningful types.

Avoid:

```ts
any
```

unless there is a documented and unavoidable reason.

Prefer:

- Explicit interfaces
- Prisma-generated types
- Narrow union types
- Typed function inputs
- Typed service responses

Example:

```ts
interface DashboardSummary {
  containerCount: number;
  inventoryItemCount: number;
  mediaCount: number;
}
```

Shared feature types should be placed near the feature unless they are reused broadly.

---

# Naming Conventions

## Files

Use lowercase kebab-case:

```text
dashboard-service.ts
inventory-media-gallery.tsx
storage-provider.ts
```

## React Components

Use PascalCase:

```tsx
DashboardSummaryCards
InventoryMediaGallery
StorageUtilization
```

## Functions and Variables

Use camelCase:

```ts
getDashboardData
inventoryItemCount
saveInventoryPhoto
```

## Types and Interfaces

Use PascalCase:

```ts
DashboardData
StorageProvider
SaveFileInput
```

## Constants

Use uppercase snake case when the value is truly constant:

```ts
MAX_UPLOAD_SIZE
SUPPORTED_IMAGE_TYPES
```

---

# Component Design Standards

Components should:

- Have one primary responsibility
- Use clear prop types
- Avoid unnecessary state
- Avoid deeply nested conditional rendering
- Reuse shared UI components
- Handle empty and loading states
- Remain responsive

Do not create abstraction solely to reduce line count. Create a component when it represents a meaningful user-interface or feature boundary.

---

# Form Standards

Forms should provide:

- Clear labels
- Required-field indicators
- Input validation
- Disabled submission while processing
- Success feedback
- Error feedback
- Accessible controls

Server-side validation is required even when client-side validation exists.

Client-side validation improves user experience but must not be treated as a security boundary.

---

# File Upload Standards

All uploads must be validated on the server.

Validation should include:

- File presence
- MIME type
- File size
- Related-record existence
- Safe server-generated filename
- Safe destination path

Never trust the original filename as a storage path.

Uploaded files must not be committed to Git.

Only placeholder files such as `.gitkeep` may be tracked inside upload directories.

---

# Storage Provider Standards

Storage operations should occur through the `StorageProvider` interface.

The application should not assume that files always live on the local filesystem.

Providers should support operations such as:

- Save
- Delete
- Existence check
- Public URL generation

Future cloud providers should be interchangeable with the current local provider wherever practical.

---

# Database Change Standards

Before changing the Prisma schema:

1. Identify the user-facing requirement.
2. Review existing relationships.
3. Consider nullable versus required fields.
4. Consider migration impact.
5. Update seed data when necessary.
6. Generate a named migration.
7. Run validation and tests.
8. Review generated SQL when the change is significant.

Avoid resetting the database unless the user explicitly accepts losing local data.

---

# Dashboard Service Pattern

Dashboard Intelligence should use one central service.

Recommended location:

```text
lib/services/dashboard-service.ts
```

The service should return one typed dashboard object containing the data required by the page.

Example structure:

```ts
interface DashboardData {
  summary: {
    locations: number;
    containers: number;
    inventoryItems: number;
    categories: number;
    media: number;
  };
  recentlyAdded: [];
  recentlyUpdated: [];
  storageUtilization: [];
  attentionItems: [];
  insights: [];
}
```

The exact structure should evolve based on the current Prisma schema and approved dashboard requirements.

The dashboard page should compose components from this returned object rather than contain numerous unrelated Prisma queries.

---

# Validation Workflow

Before committing a completed feature, run:

```bash
npm run lint
npx tsc --noEmit
git status
```

When automated tests exist, also run the relevant test suite.

The expected result is:

- No lint errors
- No TypeScript errors
- Only intended files staged
- No secrets
- No uploaded user files
- No generated local database artifacts unless intentionally tracked

---

# Git Workflow

Use a focused feature branch for major work.

Examples:

```text
feature/media-platform
feature/dashboard-intelligence
feature/qr-platform
feature/document-management
```

Recommended workflow:

```text
Create feature branch
        |
        v
Implement one cohesive feature
        |
        v
Run lint and type checks
        |
        v
Review git status
        |
        v
Commit with a clear message
        |
        v
Push branch
        |
        v
Merge after final review
```

Commit messages should describe the completed change.

Examples:

```text
Add production media platform for inventory items
Add dashboard intelligence service and summary cards
Add QR label generation for storage containers
```

Avoid vague messages such as:

```text
updates
changes
fix stuff
```

---

# Documentation Standards

Update documentation when a change affects:

- Product direction
- Architecture
- Release scope
- Setup steps
- Data model
- Deployment
- Security
- Major user workflows

Documentation should describe the actual system, not an aspirational feature as though it already exists.

Planned functionality should be clearly labeled as planned or future.

---

# Security Standards

BinVault should follow secure defaults.

At minimum:

- Validate all server input
- Sanitize and control file paths
- Keep secrets in environment variables
- Exclude `.env` files from Git
- Restrict file type and size
- Avoid exposing server internals
- Use parameterized ORM queries
- Review dependencies regularly
- Add authorization checks before multi-user deployment

Authentication, authorization, encryption, backups, and audit logging will require formal design before public deployment.

---

# Testing Direction

Testing should be added progressively.

## Unit Tests

Best suited for:

- Service calculations
- Validation rules
- Utility functions
- Dashboard insight logic

## Integration Tests

Best suited for:

- Prisma workflows
- Media persistence
- Storage operations
- API routes

## Component Tests

Best suited for:

- Forms
- Upload controls
- Delete confirmation
- Dashboard empty states
- Interactive search

## End-to-End Tests

Critical future workflows include:

- Create an inventory item
- Upload and remove a photo
- Search for an item
- Move an item between containers
- Generate and open a QR label
- View dashboard alerts
- Upload a household document

---

# Performance Guidelines

Prefer:

- Server-side data retrieval
- Focused database queries
- Parallel independent queries
- Selecting only required fields
- Pagination for large datasets
- Revalidation or caching where appropriate

Avoid:

- Loading complete records when only counts are needed
- Sequential queries that can safely run in parallel
- Excessive client-side data fetching
- Large client components without necessity
- Repeated queries for the same page data

Performance targets should be measured before being treated as guarantees.

---

# Accessibility Standards

User-interface features should include:

- Semantic HTML
- Associated form labels
- Keyboard-accessible controls
- Visible focus states
- Descriptive button text
- Alternative text for meaningful images
- Sufficient visual contrast
- Status messages that are understandable without color alone

Accessibility should be considered during implementation rather than added only at the end.

---

# Future Engineering Considerations

Future architectural work may include:

- PostgreSQL migration
- Docker deployment
- User authentication
- Role-based permissions
- Multi-property support
- Background jobs
- Scheduled reminders
- Object storage
- Audit logging
- Offline-capable PWA behavior
- Backup and restore workflows
- AI governance and privacy controls

Each major architectural choice should be documented through an Architectural Decision Record.

---

# Architectural Decision Records

Significant decisions should be recorded in:

```text
docs/adr/
```

Recommended ADR structure:

```markdown
# ADR-XXX: Decision Title

## Status

Proposed, Accepted, Superseded, or Deprecated

## Context

What problem or constraint requires a decision?

## Decision

What approach was selected?

## Alternatives Considered

What other options were evaluated?

## Consequences

What benefits, costs, risks, and limitations result from the decision?
```

Examples of future ADRs:

- Storage provider abstraction
- SQLite-to-PostgreSQL migration
- Authentication provider selection
- Background-job architecture
- Offline-first strategy
- AI data-handling policy

---

# Definition of Done

A feature is complete when:

- Approved functionality is implemented
- The code follows established architecture
- Error and empty states are handled
- Responsive behavior is reviewed
- Server-side validation is present
- Documentation is updated when necessary
- Lint passes
- TypeScript compilation passes
- Relevant tests pass
- Git status contains only intended changes
- User-generated files and secrets are excluded
- The feature has a clear commit message

---

# Engineering Philosophy

BinVault should favor deliberate, maintainable engineering over rushed feature accumulation.

Every implementation should leave the codebase easier to understand, safer to change, and better prepared for the next release.