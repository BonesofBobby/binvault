"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  INVENTORY_FIELDS,
  InventoryNotFoundError,
  InventoryValidationError,
  inventoryLifecycleService,
  type InventoryMutationInput,
} from "@/lib/services/inventory-lifecycle-service";
import type { InventoryFormActionState } from "@/lib/types/inventory-lifecycle-actions";

function valuesFrom(formData: FormData): InventoryMutationInput {
  return Object.fromEntries(
    INVENTORY_FIELDS.filter((field) => formData.has(field)).map((field) => [
      field,
      String(formData.get(field) ?? ""),
    ]),
  );
}

export async function updateInventoryItem(
  inventoryId: number,
  _state: InventoryFormActionState,
  formData: FormData,
): Promise<InventoryFormActionState> {
  const values = valuesFrom(formData);
  let updatedItem;
  try {
    updatedItem = await inventoryLifecycleService.updateInventoryItem(
      inventoryId,
      values,
    );
  } catch (error) {
    if (error instanceof InventoryValidationError) {
      return { message: error.message, fieldErrors: error.fieldErrors, values };
    }
    if (error instanceof InventoryNotFoundError) {
      return { message: error.message, fieldErrors: {}, values };
    }
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${inventoryId}`);
  revalidatePath(`/storage/${updatedItem.containerId}`);
  redirect(`/inventory/${inventoryId}`);
}
