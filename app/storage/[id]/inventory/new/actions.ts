"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db/prisma";

const validInventoryTypes = [
  "STANDARD_ITEM",
  "ASSET",
  "CONSUMABLE",
  "DOCUMENT",
] as const;

type InventoryTypeValue = (typeof validInventoryTypes)[number];

export async function createInventoryItem(
  containerId: number,
  formData: FormData,
) {
  const name = String(formData.get("name") ?? "").trim();
  const inventoryTypeValue = String(
    formData.get("inventoryType") ?? "STANDARD_ITEM",
  );
  const quantity = Number(formData.get("quantity") ?? 1);
  const categoryIdValue = String(formData.get("categoryId") ?? "");
  const condition = String(formData.get("condition") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) {
    throw new Error("Item name is required.");
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be a whole number greater than zero.");
  }

  if (
    !validInventoryTypes.includes(
      inventoryTypeValue as InventoryTypeValue,
    )
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

  const container = await prisma.container.findUnique({
    where: {
      id: containerId,
    },
    select: {
      id: true,
    },
  });

  if (!container) {
    throw new Error("Container not found.");
  }

  await prisma.inventoryItem.create({
    data: {
      containerId,
      name,
      inventoryType:
        inventoryTypeValue as InventoryTypeValue,
      quantity,
      categoryId,
      condition: condition || null,
      notes: notes || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/storage");
  revalidatePath(`/storage/${containerId}`);

  redirect(`/storage/${containerId}`);
}