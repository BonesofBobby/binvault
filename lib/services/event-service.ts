import { Prisma, type Event } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export const EVENT_TYPES = [
  "inventory.created",
  "inventory.edited",
  "inventory.moved",
  "inventory.deleted",
  "container.created",
  "container.edited",
  "container.deleted",
  "location.created",
  "location.edited",
  "location.deleted",
  "containerType.created",
  "containerType.edited",
  "containerType.deleted",
  "category.created",
  "category.edited",
  "category.deleted",
  "media.uploaded",
  "media.deleted",
] as const;

export const ENTITY_TYPES = [
  "inventory",
  "container",
  "media",
  "location",
  "containerType",
  "category",
] as const;

export const ACTOR_TYPES = ["local-system", "user"] as const;

export type EventType = (typeof EVENT_TYPES)[number];
export type EntityType = (typeof ENTITY_TYPES)[number];
export type ActorType = (typeof ACTOR_TYPES)[number];

type EventDatabase = Pick<Prisma.TransactionClient, "event">;

export type RecordEventInput = {
  eventType: EventType;
  entityType: EntityType;
  entityId?: string | number | null;
  summary: string;
  metadata?: Prisma.InputJsonObject | null;
  actorType?: ActorType;
  actorId?: string | null;
  createdAt?: Date;
};

const MAX_SUMMARY_LENGTH = 500;
const MAX_METADATA_BYTES = 8 * 1024;
const MAX_METADATA_DEPTH = 5;

export class EventValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventValidationError";
  }
}

function validateIdentifier(
  value: string,
  allowed: readonly string[],
  label: string,
) {
  if (!allowed.includes(value)) {
    throw new EventValidationError(`Unsupported ${label}.`);
  }
}

function validateJsonValue(value: unknown, depth = 0): void {
  if (depth > MAX_METADATA_DEPTH) {
    throw new EventValidationError("Event metadata is too deeply nested.");
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new EventValidationError("Event metadata contains an invalid number.");
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      validateJsonValue(item, depth + 1);
    }
    return;
  }

  if (typeof value === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      throw new EventValidationError("Event metadata must contain plain JSON values.");
    }
    for (const item of Object.values(value as Record<string, unknown>)) {
      validateJsonValue(item, depth + 1);
    }
    return;
  }

  throw new EventValidationError("Event metadata must contain only JSON values.");
}

function normalizeInput(input: RecordEventInput) {
  validateIdentifier(input.eventType, EVENT_TYPES, "event type");
  validateIdentifier(input.entityType, ENTITY_TYPES, "entity type");

  const entityId =
    input.entityId === null || input.entityId === undefined
      ? null
      : String(input.entityId).trim();
  if (input.entityId !== null && input.entityId !== undefined && !entityId) {
    throw new EventValidationError("A non-empty entity ID is required when provided.");
  }

  const summary = input.summary.trim();
  if (!summary) {
    throw new EventValidationError("An event summary is required.");
  }
  if (summary.length > MAX_SUMMARY_LENGTH) {
    throw new EventValidationError("The event summary is too long.");
  }

  const actorType = input.actorType ?? "local-system";
  validateIdentifier(actorType, ACTOR_TYPES, "actor type");
  const actorId = input.actorId?.trim() || null;
  if (actorType === "user" && !actorId) {
    throw new EventValidationError("A user actor ID is required for user events.");
  }
  if (actorType === "local-system" && actorId) {
    throw new EventValidationError("Local system events cannot have an actor ID.");
  }

  const metadata = input.metadata ?? null;
  if (metadata !== null) {
    if (Array.isArray(metadata) || Object.getPrototypeOf(metadata) !== Object.prototype) {
      throw new EventValidationError("Event metadata must be a JSON object.");
    }
    validateJsonValue(metadata);
    if (Buffer.byteLength(JSON.stringify(metadata), "utf8") > MAX_METADATA_BYTES) {
      throw new EventValidationError("Event metadata is too large.");
    }
  }

  if (input.createdAt && Number.isNaN(input.createdAt.getTime())) {
    throw new EventValidationError("The event timestamp is invalid.");
  }

  return {
    eventType: input.eventType,
    entityType: input.entityType,
    entityId,
    summary,
    metadata: metadata ?? Prisma.JsonNull,
    actorType,
    actorId,
    createdAt: input.createdAt,
  };
}

function validateLimit(limit: number) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new EventValidationError("Event list limit must be between 1 and 100.");
  }
}

export async function recordEvent(
  input: RecordEventInput,
  database: EventDatabase = prisma,
): Promise<Event> {
  return database.event.create({ data: normalizeInput(input) });
}

export async function listRecentEvents(limit = 10): Promise<Event[]> {
  validateLimit(limit);
  return prisma.event.findMany({
    take: limit,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}

export async function getEventsForEntity(
  entityType: EntityType,
  entityId: string | number,
  limit = 50,
): Promise<Event[]> {
  validateIdentifier(entityType, ENTITY_TYPES, "entity type");
  const normalizedEntityId = String(entityId).trim();
  if (!normalizedEntityId) {
    throw new EventValidationError("A non-empty entity ID is required.");
  }
  validateLimit(limit);

  return prisma.event.findMany({
    where: { entityType, entityId: normalizedEntityId },
    take: limit,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}
