import type { ReferenceDataFieldErrors } from "@/lib/services/reference-data-service";

export type ReferenceDataActionState = {
  message: string | null;
  fieldErrors: ReferenceDataFieldErrors;
};

export type DeleteReferenceDataActionState = {
  message: string | null;
  success: boolean;
};
