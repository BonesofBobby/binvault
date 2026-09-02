# First-Run Settings and Reference Data

BinVault v1.0 starts with an empty database and guides the user through creating
the reusable values needed by normal inventory workflows. It does not create
hidden defaults and does not run the development seed automatically.

## Settings routes

- `/settings` explains the reusable data available to manage.
- `/settings/locations` manages storage locations and their optional parents.
- `/settings/container-types` manages reusable container classifications.
- `/settings/categories` manages optional inventory categories.

A new container requires at least one Location and one Container Type. When
either list is empty, the container form identifies exactly what is missing and
links directly to the appropriate Settings page. Categories remain optional;
inventory can be saved as Uncategorized when none exist.

## Validation and safe deletion

All mutations use the reference-data service layer and server-side validation.
Names are trimmed, required, limited to 100 characters, and checked for
duplicates where applicable. Referenced IDs must identify existing records.
Expected validation and usage errors are returned without exposing raw Prisma
exceptions.

Container Type and Category names are globally unique because the schema
enforces that constraint. Location names are unique among siblings at the same
hierarchy level; the same household label may be reused beneath different
parents because `Location.name` is not globally unique in the schema.

Location parents are optional. A location cannot parent itself, select one of
its descendants as its parent, or otherwise create a cycle. Deletion is blocked
when a Location has child Locations or referenced Containers.

Container Types cannot be deleted while referenced by Containers. Categories
cannot be deleted while referenced by Inventory Items; BinVault does not use
the nullable category relationship to silently clear those assignments.

Successful create, edit, and delete operations append bounded Event records in
the same transaction as the reference-data mutation. Failed validation and
blocked deletion do not create success events.

## Development seed

`prisma/seed.ts` remains development-only and destructive: it deletes existing
inventory, containers, categories, container types, and locations before
creating demonstration data. It must not be used as normal first-run setup.
Users can complete v1.0 setup entirely through Settings without knowing about
Prisma or running a seed command.
