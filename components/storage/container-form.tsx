"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
} from "react";
import { Save } from "lucide-react";

import {
  type ContainerActionState,
} from "@/lib/types/container-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ContainerField } from "@/lib/services/container-service";

type LocationOption = {
  id: number;
  name: string;
  parent: {
    name: string;
  } | null;
};

type ContainerTypeOption = {
  id: number;
  name: string;
};

type ContainerFormValues = {
  binNumber: string;
  name: string;
  description: string;
  notes: string;
  locationId: number | null;
  containerTypeId: number | null;
  status: "EMPTY" | "PARTIAL" | "COMPLETE";
};

type ContainerFormProps = {
  action: (
    state: ContainerActionState,
    formData: FormData,
  ) => Promise<ContainerActionState>;
  values: ContainerFormValues;
  locations: LocationOption[];
  containerTypes: ContainerTypeOption[];
  cancelHref: string;
  submitLabel: string;
};

const controlClass =
  "h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 outline-none transition focus-visible:border-blue-500 focus-visible:ring-3 focus-visible:ring-blue-500/20";

const initialContainerActionState: ContainerActionState = {
  message: null,
  fieldErrors: {},
};

function locationLabel(location: LocationOption) {
  return location.parent
    ? `${location.parent.name} / ${location.name}`
    : location.name;
}

export function ContainerForm({
  action,
  values,
  locations,
  containerTypes,
  cancelHref,
  submitLabel,
}: ContainerFormProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialContainerActionState,
  );
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.message) {
      errorSummaryRef.current?.focus();
    }
  }, [state]);

  function fieldError(field: ContainerField) {
    return state.fieldErrors[field];
  }

  function describedBy(field: ContainerField) {
    return fieldError(field)
      ? `container-${field}-error`
      : undefined;
  }

  return (
    <form
      action={formAction}
      className="space-y-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
      noValidate
    >
      {state.message ? (
        <div
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200 outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <p className="font-semibold">
            Container could not be saved
          </p>
          <p className="mt-1">{state.message}</p>
        </div>
      ) : null}

      <section>
        <h2 className="text-xl font-semibold">
          Container Information
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Identify the container and describe what it is used for.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">
              Identifying label
            </span>
            <Input
              name="binNumber"
              defaultValue={values.binNumber}
              required
              autoFocus
              aria-invalid={Boolean(fieldError("binNumber"))}
              aria-describedby={describedBy("binNumber")}
              className="h-11 rounded-xl border-slate-700 bg-slate-950 px-4"
              placeholder="Example: BIN-GARAGE-001"
            />
            {fieldError("binNumber") ? (
              <p
                id="container-binNumber-error"
                className="text-sm text-red-300"
              >
                {fieldError("binNumber")}
              </p>
            ) : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">
              Container name
            </span>
            <Input
              name="name"
              defaultValue={values.name}
              required
              aria-invalid={Boolean(fieldError("name"))}
              aria-describedby={describedBy("name")}
              className="h-11 rounded-xl border-slate-700 bg-slate-950 px-4"
              placeholder="Example: Electrical Supplies"
            />
            {fieldError("name") ? (
              <p
                id="container-name-error"
                className="text-sm text-red-300"
              >
                {fieldError("name")}
              </p>
            ) : null}
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">
              Description
            </span>
            <Textarea
              name="description"
              defaultValue={values.description}
              rows={3}
              className="min-h-24 rounded-xl border-slate-700 bg-slate-950 px-4 py-3"
              placeholder="Optional description of this container"
            />
          </label>
        </div>
      </section>

      <section className="border-t border-slate-800 pt-8">
        <h2 className="text-xl font-semibold">
          Storage Assignment
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Choose where the container is stored and how it is classified.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-medium">Location</span>
            <select
              name="locationId"
              defaultValue={values.locationId ?? ""}
              required
              aria-invalid={Boolean(fieldError("locationId"))}
              aria-describedby={describedBy("locationId")}
              className={controlClass}
            >
              <option value="">Select a location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {locationLabel(location)}
                </option>
              ))}
            </select>
            {fieldError("locationId") ? (
              <p
                id="container-locationId-error"
                className="text-sm text-red-300"
              >
                {fieldError("locationId")}
              </p>
            ) : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">
              Container type
            </span>
            <select
              name="containerTypeId"
              defaultValue={values.containerTypeId ?? ""}
              required
              aria-invalid={Boolean(
                fieldError("containerTypeId"),
              )}
              aria-describedby={describedBy(
                "containerTypeId",
              )}
              className={controlClass}
            >
              <option value="">Select a container type</option>
              {containerTypes.map((containerType) => (
                <option
                  key={containerType.id}
                  value={containerType.id}
                >
                  {containerType.name}
                </option>
              ))}
            </select>
            {fieldError("containerTypeId") ? (
              <p
                id="container-containerTypeId-error"
                className="text-sm text-red-300"
              >
                {fieldError("containerTypeId")}
              </p>
            ) : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Status</span>
            <select
              name="status"
              defaultValue={values.status}
              required
              aria-invalid={Boolean(fieldError("status"))}
              aria-describedby={describedBy("status")}
              className={controlClass}
            >
              <option value="EMPTY">Empty</option>
              <option value="PARTIAL">Partially filled</option>
              <option value="COMPLETE">Complete</option>
            </select>
            {fieldError("status") ? (
              <p
                id="container-status-error"
                className="text-sm text-red-300"
              >
                {fieldError("status")}
              </p>
            ) : null}
          </label>
        </div>
      </section>

      <section className="border-t border-slate-800 pt-8">
        <label className="space-y-2">
          <span className="text-sm font-medium">Notes</span>
          <Textarea
            name="notes"
            defaultValue={values.notes}
            rows={4}
            className="min-h-28 rounded-xl border-slate-700 bg-slate-950 px-4 py-3"
            placeholder="Optional handling, access, or organization notes"
          />
        </label>
      </section>

      {locations.length === 0 ||
      containerTypes.length === 0 ? (
        <p
          role="status"
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100"
        >
          A location and container type must already exist before a
          container can be saved.
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:justify-end">
        <Link
          href={cancelHref}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700 px-4 font-medium text-slate-300 transition hover:bg-slate-800"
        >
          Cancel
        </Link>

        <Button
          type="submit"
          size="lg"
          disabled={
            isPending ||
            locations.length === 0 ||
            containerTypes.length === 0
          }
          className="h-10 rounded-xl px-4"
        >
          <Save aria-hidden="true" />
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
