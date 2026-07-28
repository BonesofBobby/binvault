"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ContainerDeletionBlockedError,
  ContainerNotFoundError,
  ContainerValidationError,
  createContainer,
  deleteContainer,
  updateContainer,
  type ContainerManagementInput,
} from "@/lib/services/container-service";
import type {
  ContainerActionState,
  DeleteContainerActionState,
} from "@/lib/types/container-actions";

function parseOptionalId(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseContainerInput(
  formData: FormData,
): ContainerManagementInput {
  return {
    binNumber: String(formData.get("binNumber") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(
      formData.get("description") ?? "",
    ),
    notes: String(formData.get("notes") ?? ""),
    locationId: parseOptionalId(
      formData.get("locationId"),
    ),
    containerTypeId: parseOptionalId(
      formData.get("containerTypeId"),
    ),
    status: String(formData.get("status") ?? ""),
  };
}

function mapContainerActionError(
  error: unknown,
): ContainerActionState {
  if (error instanceof ContainerValidationError) {
    return {
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  if (error instanceof ContainerNotFoundError) {
    return {
      message:
        "This container no longer exists. Return to Storage and choose another container.",
      fieldErrors: {},
    };
  }

  throw error;
}

export async function createContainerAction(
  _state: ContainerActionState,
  formData: FormData,
): Promise<ContainerActionState> {
  let container;

  try {
    container = await createContainer(
      parseContainerInput(formData),
    );
  } catch (error) {
    return mapContainerActionError(error);
  }

  revalidatePath("/");
  revalidatePath("/storage");
  redirect(`/storage/${container.id}`);
}

export async function updateContainerAction(
  containerId: number,
  _state: ContainerActionState,
  formData: FormData,
): Promise<ContainerActionState> {
  try {
    await updateContainer(
      containerId,
      parseContainerInput(formData),
    );
  } catch (error) {
    return mapContainerActionError(error);
  }

  revalidatePath("/");
  revalidatePath("/storage");
  revalidatePath(`/storage/${containerId}`);
  redirect(`/storage/${containerId}`);
}

export async function deleteContainerAction(
  containerId: number,
  state: DeleteContainerActionState,
  formData: FormData,
): Promise<DeleteContainerActionState> {
  void state;
  void formData;

  try {
    await deleteContainer(containerId);
  } catch (error) {
    if (
      error instanceof ContainerDeletionBlockedError ||
      error instanceof ContainerNotFoundError
    ) {
      return {
        message: error.message,
      };
    }

    throw error;
  }

  revalidatePath("/");
  revalidatePath("/storage");
  redirect("/storage");
}
