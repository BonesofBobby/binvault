"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  InventoryMoveValidationError,
  InventoryNotFoundError,
  inventoryLifecycleService,
} from "@/lib/services/inventory-lifecycle-service";
import type {
  DeleteInventoryActionState,
  MoveInventoryActionState,
} from "@/lib/types/inventory-lifecycle-actions";

function revalidateInventoryLifecycle(
  inventoryId: number,
  containerIds: number[],
) {
  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${inventoryId}`);
  revalidatePath("/storage");
  revalidatePath("/api/search");

  for (const containerId of new Set(containerIds)) {
    revalidatePath(`/storage/${containerId}`);
  }
}

export async function moveInventoryItemAction(
  inventoryId: number,
  _state: MoveInventoryActionState,
  formData: FormData,
): Promise<MoveInventoryActionState> {
  const destinationContainerId = Number(
    formData.get("destinationContainerId"),
  );
  let result;

  try {
    result = await inventoryLifecycleService.moveInventoryItem(
      inventoryId,
      destinationContainerId,
    );
  } catch (error) {
    if (error instanceof InventoryMoveValidationError) {
      return {
        message: error.message,
        destinationError: error.destinationError,
      };
    }

    if (error instanceof InventoryNotFoundError) {
      return {
        message:
          "This inventory item no longer exists. Return to Inventory and choose another item.",
        destinationError: null,
      };
    }

    throw error;
  }

  revalidateInventoryLifecycle(inventoryId, [
    result.previousContainerId,
    result.destinationContainerId,
  ]);
  redirect(`/inventory/${inventoryId}`);
}

export async function deleteInventoryItemAction(
  inventoryId: number,
  _state: DeleteInventoryActionState,
  _formData: FormData,
): Promise<DeleteInventoryActionState> {
  void _state;
  void _formData;

  let result;

  try {
    result =
      await inventoryLifecycleService.deleteInventoryItem(
        inventoryId,
      );
  } catch (error) {
    if (error instanceof InventoryNotFoundError) {
      return {
        message:
          "This inventory item no longer exists. Return to Inventory and choose another item.",
      };
    }

    throw error;
  }

  revalidateInventoryLifecycle(inventoryId, [
    result.previousContainerId,
  ]);

  const query =
    result.failedMediaCleanupCount > 0
      ? `?cleanupWarning=${result.failedMediaCleanupCount}`
      : "?deleted=true";
  redirect(`/inventory${query}`);
}
