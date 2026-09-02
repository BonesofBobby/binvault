import type {
  InventoryFieldErrors,
  InventoryMutationInput,
} from "@/lib/services/inventory-lifecycle-service";

export type InventoryFormActionState = {
  message: string | null;
  fieldErrors: InventoryFieldErrors;
  values: InventoryMutationInput | null;
};

export type MoveInventoryActionState = {
  message: string | null;
  destinationError: string | null;
};

export type DeleteInventoryActionState = {
  message: string | null;
};
