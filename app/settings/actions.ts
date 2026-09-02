"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ReferenceDataDeletionBlockedError,
  ReferenceDataNotFoundError,
  ReferenceDataValidationError,
  createCategory,
  createContainerType,
  createLocation,
  deleteCategory,
  deleteContainerType,
  deleteLocation,
  updateCategory,
  updateContainerType,
  updateLocation,
} from "@/lib/services/reference-data-service";
import type {
  DeleteReferenceDataActionState,
  ReferenceDataActionState,
} from "@/lib/types/reference-data-actions";

function nameFrom(formData: FormData) {
  return String(formData.get("name") ?? "");
}

function parentIdFrom(formData: FormData) {
  const value = String(formData.get("parentId") ?? "").trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function mapWriteError(error: unknown): ReferenceDataActionState {
  if (error instanceof ReferenceDataValidationError) {
    return { message: error.message, fieldErrors: error.fieldErrors };
  }
  if (error instanceof ReferenceDataNotFoundError) {
    return { message: error.message, fieldErrors: {} };
  }
  throw error;
}

function mapDeleteError(error: unknown): DeleteReferenceDataActionState {
  if (
    error instanceof ReferenceDataDeletionBlockedError ||
    error instanceof ReferenceDataNotFoundError
  ) {
    return { message: error.message, success: false };
  }
  throw error;
}

function refreshReferenceData(path: string) {
  revalidatePath("/");
  revalidatePath("/storage");
  revalidatePath("/storage/new");
  revalidatePath("/settings");
  revalidatePath(path);
}

export async function createLocationAction(
  _state: ReferenceDataActionState,
  formData: FormData,
): Promise<ReferenceDataActionState> {
  try {
    await createLocation({ name: nameFrom(formData), parentId: parentIdFrom(formData) });
  } catch (error) {
    return mapWriteError(error);
  }
  refreshReferenceData("/settings/locations");
  redirect("/settings/locations");
}

export async function updateLocationAction(
  locationId: number,
  _state: ReferenceDataActionState,
  formData: FormData,
): Promise<ReferenceDataActionState> {
  try {
    await updateLocation(locationId, {
      name: nameFrom(formData),
      parentId: parentIdFrom(formData),
    });
  } catch (error) {
    return mapWriteError(error);
  }
  refreshReferenceData("/settings/locations");
  redirect("/settings/locations");
}

export async function deleteLocationAction(
  locationId: number,
  _state: DeleteReferenceDataActionState,
  _formData: FormData,
): Promise<DeleteReferenceDataActionState> {
  void _state;
  void _formData;
  try {
    await deleteLocation(locationId);
  } catch (error) {
    return mapDeleteError(error);
  }
  refreshReferenceData("/settings/locations");
  return { message: "Location deleted.", success: true };
}

export async function createContainerTypeAction(
  _state: ReferenceDataActionState,
  formData: FormData,
): Promise<ReferenceDataActionState> {
  try {
    await createContainerType({ name: nameFrom(formData) });
  } catch (error) {
    return mapWriteError(error);
  }
  refreshReferenceData("/settings/container-types");
  redirect("/settings/container-types");
}

export async function updateContainerTypeAction(
  containerTypeId: number,
  _state: ReferenceDataActionState,
  formData: FormData,
): Promise<ReferenceDataActionState> {
  try {
    await updateContainerType(containerTypeId, { name: nameFrom(formData) });
  } catch (error) {
    return mapWriteError(error);
  }
  refreshReferenceData("/settings/container-types");
  redirect("/settings/container-types");
}

export async function deleteContainerTypeAction(
  containerTypeId: number,
  _state: DeleteReferenceDataActionState,
  _formData: FormData,
): Promise<DeleteReferenceDataActionState> {
  void _state;
  void _formData;
  try {
    await deleteContainerType(containerTypeId);
  } catch (error) {
    return mapDeleteError(error);
  }
  refreshReferenceData("/settings/container-types");
  return { message: "Container type deleted.", success: true };
}

export async function createCategoryAction(
  _state: ReferenceDataActionState,
  formData: FormData,
): Promise<ReferenceDataActionState> {
  try {
    await createCategory({ name: nameFrom(formData) });
  } catch (error) {
    return mapWriteError(error);
  }
  refreshReferenceData("/settings/categories");
  redirect("/settings/categories");
}

export async function updateCategoryAction(
  categoryId: number,
  _state: ReferenceDataActionState,
  formData: FormData,
): Promise<ReferenceDataActionState> {
  try {
    await updateCategory(categoryId, { name: nameFrom(formData) });
  } catch (error) {
    return mapWriteError(error);
  }
  refreshReferenceData("/settings/categories");
  redirect("/settings/categories");
}

export async function deleteCategoryAction(
  categoryId: number,
  _state: DeleteReferenceDataActionState,
  _formData: FormData,
): Promise<DeleteReferenceDataActionState> {
  void _state;
  void _formData;
  try {
    await deleteCategory(categoryId);
  } catch (error) {
    return mapDeleteError(error);
  }
  refreshReferenceData("/settings/categories");
  return { message: "Category deleted.", success: true };
}
