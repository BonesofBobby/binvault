import { InventoryType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type {
  DashboardAttention,
  DashboardAttentionItem,
} from "@/lib/types/dashboard";

const WARNING_WINDOW_DAYS = 30;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function getDashboardAttention(): Promise<DashboardAttention> {
  const today = new Date();
  const warningDate = addDays(today, WARNING_WINDOW_DAYS);

  const [
    expiringDocuments,
    expiringWarranties,
    lowConsumables,
  ] = await prisma.$transaction([
    prisma.inventoryItem.findMany({
      where: {
        inventoryType: InventoryType.DOCUMENT,
        expirationDate: {
          gte: today,
          lte: warningDate,
        },
      },
      orderBy: {
        expirationDate: "asc",
      },
    }),

    prisma.inventoryItem.findMany({
      where: {
        warrantyEnd: {
          gte: today,
          lte: warningDate,
        },
      },
      orderBy: {
        warrantyEnd: "asc",
      },
    }),

    prisma.inventoryItem.findMany({
      where: {
        inventoryType: InventoryType.CONSUMABLE,
        minimumQuantity: {
          not: null,
        },
      },
      orderBy: {
        quantity: "asc",
      },
    }),
  ]);

  const items: DashboardAttentionItem[] = [];

  for (const item of expiringDocuments) {
    items.push({
      id: `document-${item.id}`,
      type: "expiring-document",
      severity: "warning",
      title: "Document Expiring",
      description: `${item.name} expires soon.`,
      inventoryItemId: item.id,
      inventoryItemName: item.name,
      dueDate: item.expirationDate,
      currentQuantity: null,
      minimumQuantity: null,
    });
  }

  for (const item of expiringWarranties) {
    items.push({
      id: `warranty-${item.id}`,
      type: "expiring-warranty",
      severity: "information",
      title: "Warranty Expiring",
      description: `${item.name} warranty expires soon.`,
      inventoryItemId: item.id,
      inventoryItemName: item.name,
      dueDate: item.warrantyEnd,
      currentQuantity: null,
      minimumQuantity: null,
    });
  }

  for (const item of lowConsumables) {
    if (
      item.minimumQuantity !== null &&
      item.quantity <= item.minimumQuantity
    ) {
      items.push({
        id: `consumable-${item.id}`,
        type: "low-consumable",
        severity: "critical",
        title: "Low Inventory",
        description: `${item.name} is at or below its minimum quantity.`,
        inventoryItemId: item.id,
        inventoryItemName: item.name,
        dueDate: null,
        currentQuantity: item.quantity,
        minimumQuantity: item.minimumQuantity,
      });
    }
  }

  return {
    items,
    criticalCount: items.filter(
      (item) => item.severity === "critical"
    ).length,
    warningCount: items.filter(
      (item) => item.severity === "warning"
    ).length,
    informationCount: items.filter(
      (item) => item.severity === "information"
    ).length,
  };
}