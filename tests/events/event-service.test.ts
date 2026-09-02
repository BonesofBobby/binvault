import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import {
  EventValidationError,
  getEventsForEntity,
  listRecentEvents,
  recordEvent,
} from "@/lib/services/event-service";

describe("Event service", () => {
  it("records a validated local-system event", async () => {
    const event = await recordEvent({
      eventType: "inventory.created",
      entityType: "inventory",
      entityId: 42,
      summary: "Created inventory item Drill.",
      metadata: { itemName: "Drill", quantity: 1 },
    });

    expect(event).toMatchObject({
      eventType: "inventory.created",
      entityType: "inventory",
      entityId: "42",
      summary: "Created inventory item Drill.",
      actorType: "local-system",
      actorId: null,
      metadata: { itemName: "Drill", quantity: 1 },
    });
  });

  it("rejects invalid identifiers, summaries, actors, metadata, and limits", async () => {
    await expect(
      recordEvent({
        eventType: "invalid" as "inventory.created",
        entityType: "inventory",
        summary: "Invalid",
      }),
    ).rejects.toBeInstanceOf(EventValidationError);
    await expect(
      recordEvent({
        eventType: "inventory.created",
        entityType: "invalid" as "inventory",
        summary: "Invalid",
      }),
    ).rejects.toBeInstanceOf(EventValidationError);
    await expect(
      recordEvent({
        eventType: "inventory.created",
        entityType: "inventory",
        entityId: " ",
        summary: "Invalid",
      }),
    ).rejects.toBeInstanceOf(EventValidationError);
    await expect(
      recordEvent({
        eventType: "inventory.created",
        entityType: "inventory",
        summary: " ",
      }),
    ).rejects.toBeInstanceOf(EventValidationError);
    await expect(
      recordEvent({
        eventType: "inventory.created",
        entityType: "inventory",
        summary: "Invalid actor",
        actorType: "user",
      }),
    ).rejects.toBeInstanceOf(EventValidationError);
    await expect(
      recordEvent({
        eventType: "inventory.created",
        entityType: "inventory",
        summary: "Invalid metadata",
        metadata: [] as never,
      }),
    ).rejects.toBeInstanceOf(EventValidationError);
    await expect(listRecentEvents(0)).rejects.toBeInstanceOf(EventValidationError);
  });

  it("orders recent events newest first with a stable ID tie-breaker", async () => {
    const sameTime = new Date("2026-01-01T00:00:00.000Z");
    const first = await recordEvent({
      eventType: "container.created",
      entityType: "container",
      entityId: 1,
      summary: "First.",
      createdAt: sameTime,
    });
    const second = await recordEvent({
      eventType: "container.edited",
      entityType: "container",
      entityId: 1,
      summary: "Second.",
      createdAt: sameTime,
    });
    await recordEvent({
      eventType: "container.deleted",
      entityType: "container",
      entityId: 2,
      summary: "Newest.",
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
    });

    const recent = await listRecentEvents(2);
    expect(recent.map((event) => event.summary)).toEqual(["Newest.", "Second."]);
    expect(second.id).toBeGreaterThan(first.id);
  });

  it("filters entity history and returns an empty history", async () => {
    await recordEvent({
      eventType: "inventory.created",
      entityType: "inventory",
      entityId: 10,
      summary: "Target.",
    });
    await recordEvent({
      eventType: "inventory.created",
      entityType: "inventory",
      entityId: 11,
      summary: "Other.",
    });

    await expect(getEventsForEntity("inventory", 10)).resolves.toMatchObject([
      { summary: "Target." },
    ]);
    await expect(getEventsForEntity("inventory", 999)).resolves.toEqual([]);
  });

  it("rolls back events with their surrounding transaction", async () => {
    await expect(
      prisma.$transaction(async (transaction) => {
        await recordEvent(
          {
            eventType: "inventory.created",
            entityType: "inventory",
            entityId: 1,
            summary: "Rolled back.",
          },
          transaction,
        );
        throw new Error("fail transaction");
      }),
    ).rejects.toThrow("fail transaction");

    await expect(prisma.event.count()).resolves.toBe(0);
  });
});
