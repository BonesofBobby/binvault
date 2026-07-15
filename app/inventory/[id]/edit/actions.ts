"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db/prisma";

const inventoryTypes = [
  "STANDARD_ITEM",
  "ASSET",
  "CONSUMABLE",
  "DOCUMENT",
] as const;

type InventoryTypeValue = (typeof inventoryTypes)[number];

function optionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function optionalNumber(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function optionalInteger(formData: FormData, key: string) {
  const value = optionalNumber(formData, key);

  if (value === null || !Number.isInteger(value)) {
    return null;
  }

  return value;
}

function optionalDate(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export async function updateInventoryItem(
  inventoryId: number,
  formData: FormData,
) {
  const name = String(formData.get("name") ?? "").trim();
  const inventoryTypeValue = String(
    formData.get("inventoryType") ?? "STANDARD_ITEM",
  );
  const quantity = Number(formData.get("quantity") ?? 1);
  const containerId = Number(formData.get("containerId"));
  const categoryIdValue = String(formData.get("categoryId") ?? "");

  if (!name) {
    throw new Error("Inventory name is required.");
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be a whole number greater than zero.");
  }

  if (!Number.isInteger(containerId) || containerId < 1) {
    throw new Error("A valid container is required.");
  }

  if (
    !inventoryTypes.includes(inventoryTypeValue as InventoryTypeValue)
  ) {
    throw new Error("Invalid inventory type.");
  }

  const categoryId = categoryIdValue
    ? Number(categoryIdValue)
    : null;

  if (
    categoryId !== null &&
    (!Number.isInteger(categoryId) || categoryId < 1)
  ) {
    throw new Error("Invalid category.");
  }

  const existingItem = await prisma.inventoryItem.findUnique({
    where: { id: inventoryId },
    select: {
      id: true,
      containerId: true,
    },
  });

  if (!existingItem) {
    throw new Error("Inventory record not found.");
  }

  const inventoryType =
    inventoryTypeValue as InventoryTypeValue;

  await prisma.inventoryItem.update({
    where: {
      id: inventoryId,
    },
    data: {
      name,
      inventoryType,
      quantity,
      containerId,
      categoryId,
      condition: optionalString(formData, "condition"),
      notes: optionalString(formData, "notes"),

      manufacturer:
        inventoryType === "ASSET"
          ? optionalString(formData, "manufacturer")
          : null,
      modelNumber:
        inventoryType === "ASSET"
          ? optionalString(formData, "modelNumber")
          : null,
      serialNumber:
        inventoryType === "ASSET"
          ? optionalString(formData, "serialNumber")
          : null,
      purchaseDate:
        inventoryType === "ASSET"
          ? optionalDate(formData, "purchaseDate")
          : null,
      purchasePrice:
        inventoryType === "ASSET"
          ? optionalNumber(formData, "purchasePrice")
          : null,
      warrantyEnd:
        inventoryType === "ASSET"
          ? optionalDate(formData, "warrantyEnd")
          : null,

      partNumber:
        inventoryType === "CONSUMABLE"
          ? optionalString(formData, "partNumber")
          : null,
      replacementIntervalDays:
        inventoryType === "CONSUMABLE"
          ? optionalInteger(formData, "replacementIntervalDays")
          : null,
      minimumQuantity:
        inventoryType === "CONSUMABLE"
          ? optionalInteger(formData, "minimumQuantity")
          : null,

      documentType:
        inventoryType === "DOCUMENT"
          ? optionalString(formData, "documentType")
          : null,
      expirationDate:
        inventoryType === "DOCUMENT"
          ? optionalDate(formData, "expirationDate")
          : null,
    },
  });

  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${inventoryId}`);
  revalidatePath(`/storage/${existingItem.containerId}`);
  revalidatePath(`/storage/${containerId}`);

  redirect(`/inventory/${inventoryId}`);
}