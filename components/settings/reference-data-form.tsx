"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ReferenceDataActionState } from "@/lib/types/reference-data-actions";

type ParentOption = { id: number; label: string };

type ReferenceDataFormProps = {
  action: (
    state: ReferenceDataActionState,
    formData: FormData,
  ) => Promise<ReferenceDataActionState>;
  defaultName?: string;
  defaultParentId?: number | null;
  parentOptions?: ParentOption[];
  submitLabel: string;
  cancelHref?: string;
};

const initialState: ReferenceDataActionState = {
  message: null,
  fieldErrors: {},
};

export function ReferenceDataForm({
  action,
  defaultName = "",
  defaultParentId = null,
  parentOptions,
  submitLabel,
  cancelHref,
}: ReferenceDataFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.message ? (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {state.message}
        </p>
      ) : null}
      <label className="block space-y-2">
        <span className="text-sm font-medium">Name</span>
        <Input
          name="name"
          defaultValue={defaultName}
          maxLength={100}
          aria-invalid={Boolean(state.fieldErrors.name)}
          aria-describedby={state.fieldErrors.name ? "reference-name-error" : undefined}
          className="h-10 rounded-xl border-slate-700 bg-slate-950 px-3"
        />
        {state.fieldErrors.name ? (
          <p id="reference-name-error" className="text-sm text-red-300">
            {state.fieldErrors.name}
          </p>
        ) : null}
      </label>

      {parentOptions ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium">Parent location</span>
          <select
            name="parentId"
            defaultValue={defaultParentId ?? ""}
            aria-invalid={Boolean(state.fieldErrors.parentId)}
            aria-describedby={state.fieldErrors.parentId ? "reference-parent-error" : undefined}
            className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="">No parent</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {state.fieldErrors.parentId ? (
            <p id="reference-parent-error" className="text-sm text-red-300">
              {state.fieldErrors.parentId}
            </p>
          ) : null}
        </label>
      ) : null}

      <div className="flex justify-end gap-2">
        {cancelHref ? (
          <Link href={cancelHref} className="inline-flex h-9 items-center rounded-lg border border-slate-700 px-3 text-sm font-medium text-slate-300 hover:bg-slate-800">
            Cancel
          </Link>
        ) : null}
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
