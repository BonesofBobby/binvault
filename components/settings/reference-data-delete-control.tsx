"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { DeleteReferenceDataActionState } from "@/lib/types/reference-data-actions";

type Props = {
  action: (
    state: DeleteReferenceDataActionState,
    formData: FormData,
  ) => Promise<DeleteReferenceDataActionState>;
  label: string;
};

export function ReferenceDataDeleteControl({ action, label }: Props) {
  const [state, formAction, isPending] = useActionState(action, {
    message: null,
    success: false,
  });

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <Button
          type="submit"
          variant="destructive"
          size="sm"
          disabled={isPending}
          aria-label={`Delete ${label}`}
        >
          {isPending ? "Deleting…" : "Delete"}
        </Button>
      </form>
      {state.message ? (
        <p role={state.success ? "status" : "alert"} className={state.success ? "text-xs text-emerald-300" : "max-w-64 text-xs text-amber-200"}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
