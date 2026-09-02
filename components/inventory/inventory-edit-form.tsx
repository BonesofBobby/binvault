"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { InventoryMutationInput } from "@/lib/services/inventory-lifecycle-service";
import type { InventoryFormActionState } from "@/lib/types/inventory-lifecycle-actions";

type InventoryType = "STANDARD_ITEM" | "ASSET" | "CONSUMABLE" | "DOCUMENT";
type CategoryOption = { id: number; name: string };

type InventoryFormProps = {
  initialValues: InventoryMutationInput;
  categories: CategoryOption[];
  action: (
    state: InventoryFormActionState,
    formData: FormData,
  ) => Promise<InventoryFormActionState>;
  cancelHref: string;
  submitLabel: string;
};

const initialState: InventoryFormActionState = {
  message: null,
  fieldErrors: {},
  values: null,
};

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500 aria-invalid:border-red-400";

export function InventoryEditForm({
  initialValues,
  categories,
  action,
  cancelHref,
  submitLabel,
}: InventoryFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const values = { ...initialValues, ...(state.values ?? {}) };
  const [inventoryType, setInventoryType] = useState<InventoryType>(
    (values.inventoryType as InventoryType) ?? "STANDARD_ITEM",
  );

  const error = (field: keyof typeof state.fieldErrors) =>
    state.fieldErrors[field];
  const describedBy = (field: keyof typeof state.fieldErrors) =>
    error(field) ? `inventory-${field}-error` : undefined;
  const fieldError = (field: keyof typeof state.fieldErrors) =>
    error(field) ? (
      <p id={`inventory-${field}-error`} className="text-sm text-red-300">
        {error(field)}
      </p>
    ) : null;
  const categoryValue = values.categoryId ?? "";
  const staleCategory =
    categoryValue &&
    !categories.some((category) => String(category.id) === categoryValue);

  return (
    <form action={formAction} className="space-y-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      {state.message ? (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {state.message}
        </p>
      ) : null}

      <section>
        <h2 className="text-xl font-semibold">General Information</h2>
        <p className="mt-1 text-sm text-slate-400">Core details shared by every inventory type.</p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Name</span>
            <input name="name" defaultValue={values.name ?? ""} maxLength={200} required aria-invalid={Boolean(error("name"))} aria-describedby={describedBy("name")} className={inputClass} />
            {fieldError("name")}
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Inventory type</span>
            <select name="inventoryType" value={inventoryType} onChange={(event) => setInventoryType(event.target.value as InventoryType)} aria-invalid={Boolean(error("inventoryType"))} aria-describedby={describedBy("inventoryType")} className={inputClass}>
              <option value="STANDARD_ITEM">Standard Item</option>
              <option value="ASSET">Asset</option>
              <option value="CONSUMABLE">Consumable</option>
              <option value="DOCUMENT">Document</option>
            </select>
            {fieldError("inventoryType")}
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Quantity</span>
            <input name="quantity" type="number" min="1" step="1" defaultValue={values.quantity ?? "1"} required aria-invalid={Boolean(error("quantity"))} aria-describedby={describedBy("quantity")} className={inputClass} />
            {fieldError("quantity")}
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Category</span>
            <select name="categoryId" defaultValue={categoryValue} aria-invalid={Boolean(error("categoryId"))} aria-describedby={describedBy("categoryId")} className={inputClass}>
              <option value="">Uncategorized</option>
              {staleCategory ? <option value={categoryValue}>Unavailable category</option> : null}
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            {fieldError("categoryId")}
            {categories.length === 0 ? (
              <p className="text-xs text-slate-400">Categories are optional. Leave this Uncategorized or <Link href="/settings/categories" className="text-blue-300 underline underline-offset-4">create one in Settings</Link>.</p>
            ) : null}
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Condition</span>
            <input name="condition" defaultValue={values.condition ?? ""} maxLength={100} aria-invalid={Boolean(error("condition"))} aria-describedby={describedBy("condition")} className={inputClass} placeholder="New, Good, Fair, Needs Repair" />
            {fieldError("condition")}
          </label>
        </div>
      </section>

      {inventoryType === "ASSET" ? (
        <section className="border-t border-slate-800 pt-8">
          <h2 className="text-xl font-semibold">Asset Information</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {(["manufacturer", "modelNumber", "serialNumber"] as const).map((field) => (
              <label key={field} className="space-y-2">
                <span className="text-sm font-medium">{{ manufacturer: "Manufacturer", modelNumber: "Model number", serialNumber: "Serial number" }[field]}</span>
                <input name={field} defaultValue={values[field] ?? ""} maxLength={100} aria-invalid={Boolean(error(field))} aria-describedby={describedBy(field)} className={inputClass} />
                {fieldError(field)}
              </label>
            ))}
            <label className="space-y-2">
              <span className="text-sm font-medium">Purchase price</span>
              <input name="purchasePrice" type="number" min="0" step="0.01" defaultValue={values.purchasePrice ?? ""} aria-invalid={Boolean(error("purchasePrice"))} aria-describedby={describedBy("purchasePrice")} className={inputClass} />
              {fieldError("purchasePrice")}
            </label>
            {(["purchaseDate", "warrantyEnd"] as const).map((field) => (
              <label key={field} className="space-y-2">
                <span className="text-sm font-medium">{field === "purchaseDate" ? "Purchase date" : "Warranty end"}</span>
                <input name={field} type="date" defaultValue={values[field] ?? ""} aria-invalid={Boolean(error(field))} aria-describedby={describedBy(field)} className={inputClass} />
                {fieldError(field)}
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {inventoryType === "CONSUMABLE" ? (
        <section className="border-t border-slate-800 pt-8">
          <h2 className="text-xl font-semibold">Consumable Information</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <label className="space-y-2"><span className="text-sm font-medium">Part number</span><input name="partNumber" defaultValue={values.partNumber ?? ""} maxLength={100} aria-invalid={Boolean(error("partNumber"))} aria-describedby={describedBy("partNumber")} className={inputClass} />{fieldError("partNumber")}</label>
            <label className="space-y-2"><span className="text-sm font-medium">Minimum quantity</span><input name="minimumQuantity" type="number" min="0" step="1" defaultValue={values.minimumQuantity ?? ""} aria-invalid={Boolean(error("minimumQuantity"))} aria-describedby={describedBy("minimumQuantity")} className={inputClass} />{fieldError("minimumQuantity")}</label>
            <label className="space-y-2"><span className="text-sm font-medium">Replacement interval in days</span><input name="replacementIntervalDays" type="number" min="1" step="1" defaultValue={values.replacementIntervalDays ?? ""} aria-invalid={Boolean(error("replacementIntervalDays"))} aria-describedby={describedBy("replacementIntervalDays")} className={inputClass} />{fieldError("replacementIntervalDays")}</label>
          </div>
        </section>
      ) : null}

      {inventoryType === "DOCUMENT" ? (
        <section className="border-t border-slate-800 pt-8">
          <h2 className="text-xl font-semibold">Document Information</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <label className="space-y-2"><span className="text-sm font-medium">Document type</span><input name="documentType" defaultValue={values.documentType ?? ""} maxLength={100} aria-invalid={Boolean(error("documentType"))} aria-describedby={describedBy("documentType")} className={inputClass} />{fieldError("documentType")}</label>
            <label className="space-y-2"><span className="text-sm font-medium">Expiration date</span><input name="expirationDate" type="date" defaultValue={values.expirationDate ?? ""} aria-invalid={Boolean(error("expirationDate"))} aria-describedby={describedBy("expirationDate")} className={inputClass} />{fieldError("expirationDate")}</label>
          </div>
        </section>
      ) : null}

      <section className="border-t border-slate-800 pt-8">
        <label className="space-y-2">
          <span className="text-sm font-medium">Notes</span>
          <textarea name="notes" rows={5} defaultValue={values.notes ?? ""} maxLength={2000} aria-invalid={Boolean(error("notes"))} aria-describedby={describedBy("notes")} className={`${inputClass} resize-none`} />
          {fieldError("notes")}
        </label>
      </section>

      <div className="flex justify-end gap-3 border-t border-slate-800 pt-6">
        <Link href={cancelHref} className="rounded-xl border border-slate-700 px-4 py-2.5 font-medium text-slate-300 transition hover:bg-slate-800">Cancel</Link>
        <Button type="submit" size="lg" disabled={isPending} className="h-11 rounded-xl px-4">
          <Save aria-hidden="true" />
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
