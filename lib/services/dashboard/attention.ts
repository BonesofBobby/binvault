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

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export async function getDashboardAttention(): Promise<DashboardAttention> {
  const today = startOfDay(new Date());
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
    const isExpired =
      item.expirationDate !== null &&
      item.expirationDate < today;

    items.push({
      id: `document-${item.id}`,
      type: "expiring-document",
      severity: isExpired ? "critical" : "warning",
      title: isExpired ? "Document Expired" : "Document Expiring",
      description: isExpired
        ? `${item.name} has expired.`
        : `${item.name} expires soon.`,
      inventoryItemId: item.id,
      inventoryItemName: item.name,
      dueDate: item.expirationDate,
      currentQuantity: null,
      minimumQuantity: null,
    });
  }

  for (const item of expiringWarranties) {
    const isExpired =
      item.warrantyEnd !== null &&
      item.warrantyEnd < today;

    items.push({
      id: `warranty-${item.id}`,
      type: "expiring-warranty",
      severity: isExpired ? "warning" : "information",
      title: isExpired ? "Warranty Expired" : "Warranty Expiring",
      description: isExpired
        ? `${item.name} warranty has expired.`
        : `${item.name} warranty expires soon.`,
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
