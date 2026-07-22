import type { InventoryType } from "@prisma/client";

export interface DashboardSummary {
  locationCount: number;
  containerCount: number;
  inventoryItemCount: number;
  assetCount: number;
  consumableCount: number;
  documentCount: number;
  mediaCount: number;
  categoryCount: number;
}

export type DashboardAttentionSeverity = "critical" | "warning" | "information";

export type DashboardAttentionType =
  | "expiring-document"
  | "expiring-warranty"
  | "low-consumable";

export interface DashboardAttentionItem {
  id: string;
  type: DashboardAttentionType;
  severity: DashboardAttentionSeverity;
  title: string;
  description: string;
  inventoryItemId: number;
  inventoryItemName: string;
  dueDate: Date | null;
  currentQuantity: number | null;
  minimumQuantity: number | null;
}

export interface DashboardAttention {
  items: DashboardAttentionItem[];
  criticalCount: number;
  warningCount: number;
  informationCount: number;
}

export interface DashboardRecentItem {
  id: number;
  name: string;
  inventoryType: InventoryType;
  quantity: number;
  containerId: number;
  containerName: string;
  containerBinNumber: string;
  categoryId: number | null;
  categoryName: string | null;
  primaryPhotoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStorageLocation {
  id: number;
  name: string;
  parentId: number | null;
  parentName: string | null;
  containerCount: number;
  inventoryItemCount: number;
  totalQuantity: number;
}

export interface DashboardCategoryInsight {
  id: number;
  name: string;
  inventoryItemCount: number;
  totalQuantity: number;
}

export interface DashboardContainerInsight {
  id: number;
  name: string;
  binNumber: string;
  inventoryItemCount: number;
  totalQuantity: number;
}

export interface DashboardItemInsight {
  id: number;
  name: string;
  inventoryType: InventoryType;
  containerId: number;
  containerName: string;
  containerBinNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardInsights {
  mostUsedCategory: DashboardCategoryInsight | null;
  largestContainer: DashboardContainerInsight | null;
  newestItem: DashboardItemInsight | null;
  oldestItem: DashboardItemInsight | null;
  itemsWithoutPhotosCount: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  attention: DashboardAttention;
  recentItems: DashboardRecentItem[];
  storage: DashboardStorageLocation[];
  insights: DashboardInsights;
  generatedAt: Date;
}