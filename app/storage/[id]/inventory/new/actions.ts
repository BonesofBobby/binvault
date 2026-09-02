"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  INVENTORY_FIELDS,
  InventoryContainerNotFoundError,
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

export async function createInventoryItem(
  containerId: number,
  _state: InventoryFormActionState,
  formData: FormData,
): Promise<InventoryFormActionState> {
  const values = valuesFrom(formData);
  let item;
  try {
    item = await inventoryLifecycleService.createInventoryItem(containerId, values);
  } catch (error) {
    if (error instanceof InventoryValidationError) {
      return { message: error.message, fieldErrors: error.fieldErrors, values };
    }
    if (error instanceof InventoryContainerNotFoundError) {
      return { message: error.message, fieldErrors: {}, values };
    }
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath("/storage");
  revalidatePath(`/storage/${containerId}`);
  redirect(`/inventory/${item.id}`);
}
