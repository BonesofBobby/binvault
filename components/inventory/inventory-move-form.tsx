"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MoveInventoryActionState } from "@/lib/types/inventory-lifecycle-actions";

type ContainerOption = {
  id: number;
  binNumber: string;
  name: string;
  location: {
    name: string;
  } | null;
};

type InventoryMoveFormProps = {
  action: (
    state: MoveInventoryActionState,
    formData: FormData,
  ) => Promise<MoveInventoryActionState>;
  inventoryId: number;
  currentContainer: ContainerOption;
  destinations: ContainerOption[];
};

const initialState: MoveInventoryActionState = {
  message: null,
  destinationError: null,
};

export function InventoryMoveForm({
  action,
  inventoryId,
  currentContainer,
  destinations,
}: InventoryMoveFormProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialState,
  );
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.message) {
      errorRef.current?.focus();
    }
  }, [state]);

  return (
    <form
      action={formAction}
      noValidate
      className="space-y-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
    >
      {state.message ? (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200 outline-none"
        >
          <p className="font-semibold">Item could not be moved</p>
          <p className="mt-1">{state.message}</p>
        </div>
      ) : null}

      <section>
        <h2 className="text-xl font-semibold">
          Current container
        </h2>
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="font-semibold">{currentContainer.name}</p>
          <p className="mt-1 text-sm text-blue-400">
            {currentContainer.binNumber}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {currentContainer.location?.name ?? "No location"}
          </p>
        </div>
      </section>

      <section className="border-t border-slate-800 pt-8">
        <label className="space-y-2">
          <span className="text-sm font-medium">
            Destination container
          </span>
          <select
            name="destinationContainerId"
            required
            autoFocus
            aria-invalid={Boolean(state.destinationError)}
            aria-describedby={
              state.destinationError
                ? "destination-container-error"
                : "destination-container-help"
            }
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 outline-none transition focus-visible:border-blue-500 focus-visible:ring-3 focus-visible:ring-blue-500/20"
          >
            <option value="">Select a destination</option>
            {destinations.map((container) => (
              <option key={container.id} value={container.id}>
                {container.binNumber} — {container.name}
                {container.location
                  ? ` (${container.location.name})`
                  : ""}
              </option>
            ))}
          </select>
          {state.destinationError ? (
            <p
              id="destination-container-error"
              className="text-sm text-red-300"
            >
              {state.destinationError}
            </p>
          ) : (
            <p
              id="destination-container-help"
              className="text-sm text-slate-400"
            >
              Moving changes only this item&apos;s container.
            </p>
          )}
        </label>
      </section>

      {destinations.length === 0 ? (
        <p
          role="status"
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100"
        >
          There are no other containers available. Create another
          container before moving this item.
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:justify-end">
        <Link
          href={`/inventory/${inventoryId}`}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700 px-4 font-medium text-slate-300 transition hover:bg-slate-800"
        >
          Cancel
        </Link>
        <Button type="submit" disabled={isPending || !destinations.length}>
          <ArrowRight aria-hidden="true" />
          {isPending ? "Moving…" : "Move Inventory"}
        </Button>
      </div>
    </form>
  );
}
