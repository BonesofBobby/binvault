"use client";

import Link from "next/link";
import { useState } from "react";
import { Save } from "lucide-react";

type InventoryType =
  | "STANDARD_ITEM"
  | "ASSET"
  | "CONSUMABLE"
  | "DOCUMENT";

type CategoryOption = {
  id: number;
  name: string;
};

type ContainerOption = {
  id: number;
  binNumber: string;
  name: string;
};

type InventoryEditFormProps = {
  item: {
    id: number;
    name: string;
    inventoryType: InventoryType;
    quantity: number;
    condition: string | null;
    notes: string | null;
    containerId: number;
    categoryId: number | null;
    manufacturer: string | null;
    modelNumber: string | null;
    serialNumber: string | null;
    purchaseDate: string;
    purchasePrice: number | null;
    warrantyEnd: string;
    partNumber: string | null;
    replacementIntervalDays: number | null;
    minimumQuantity: number | null;
    documentType: string | null;
    expirationDate: string;
  };
  categories: CategoryOption[];
  containers: ContainerOption[];
  action: (formData: FormData) => void | Promise<void>;
};

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500";

export function InventoryEditForm({
  item,
  categories,
  containers,
  action,
}: InventoryEditFormProps) {
  const [inventoryType, setInventoryType] =
    useState<InventoryType>(item.inventoryType);

  return (
    <form
      action={action}
      className="space-y-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
    >
      <section>
        <h2 className="text-xl font-semibold">General Information</h2>
        <p className="mt-1 text-sm text-slate-400">
          Update the primary information for this inventory record.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Name</span>
            <input
              name="name"
              defaultValue={item.name}
              required
              className={inputClass}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Inventory type</span>
            <select
              name="inventoryType"
              value={inventoryType}
              onChange={(event) =>
                setInventoryType(
                  event.target.value as InventoryType,
                )
              }
              className={inputClass}
            >
              <option value="STANDARD_ITEM">Standard Item</option>
              <option value="ASSET">Asset</option>
              <option value="CONSUMABLE">Consumable</option>
              <option value="DOCUMENT">Document</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Quantity</span>
            <input
              name="quantity"
              type="number"
              min="1"
              defaultValue={item.quantity}
              required
              className={inputClass}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Category</span>
            <select
              name="categoryId"
              defaultValue={item.categoryId ?? ""}
              className={inputClass}
            >
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Container</span>
            <select
              name="containerId"
              defaultValue={item.containerId}
              required
              className={inputClass}
            >
              {containers.map((container) => (
                <option key={container.id} value={container.id}>
                  {container.binNumber} — {container.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Condition</span>
            <input
              name="condition"
              defaultValue={item.condition ?? ""}
              className={inputClass}
              placeholder="New, Good, Fair, Needs Repair"
            />
          </label>
        </div>
      </section>

      {inventoryType === "ASSET" && (
        <section className="border-t border-slate-800 pt-8">
          <h2 className="text-xl font-semibold">Asset Information</h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Manufacturer</span>
              <input
                name="manufacturer"
                defaultValue={item.manufacturer ?? ""}
                className={inputClass}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Model number</span>
              <input
                name="modelNumber"
                defaultValue={item.modelNumber ?? ""}
                className={inputClass}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Serial number</span>
              <input
                name="serialNumber"
                defaultValue={item.serialNumber ?? ""}
                className={inputClass}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Purchase price</span>
              <input
                name="purchasePrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={item.purchasePrice ?? ""}
                className={inputClass}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Purchase date</span>
              <input
                name="purchaseDate"
                type="date"
                defaultValue={item.purchaseDate}
                className={inputClass}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Warranty end</span>
              <input
                name="warrantyEnd"
                type="date"
                defaultValue={item.warrantyEnd}
                className={inputClass}
              />
            </label>
          </div>
        </section>
      )}

      {inventoryType === "CONSUMABLE" && (
        <section className="border-t border-slate-800 pt-8">
          <h2 className="text-xl font-semibold">
            Consumable Information
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-medium">Part number</span>
              <input
                name="partNumber"
                defaultValue={item.partNumber ?? ""}
                className={inputClass}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">
                Minimum quantity
              </span>
              <input
                name="minimumQuantity"
                type="number"
                min="0"
                defaultValue={item.minimumQuantity ?? ""}
                className={inputClass}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">
                Replacement interval in days
              </span>
              <input
                name="replacementIntervalDays"
                type="number"
                min="1"
                defaultValue={
                  item.replacementIntervalDays ?? ""
                }
                className={inputClass}
              />
            </label>
          </div>
        </section>
      )}

      {inventoryType === "DOCUMENT" && (
        <section className="border-t border-slate-800 pt-8">
          <h2 className="text-xl font-semibold">
            Document Information
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Document type</span>
              <input
                name="documentType"
                defaultValue={item.documentType ?? ""}
                className={inputClass}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">
                Expiration date
              </span>
              <input
                name="expirationDate"
                type="date"
                defaultValue={item.expirationDate}
                className={inputClass}
              />
            </label>
          </div>
        </section>
      )}

      <section className="border-t border-slate-800 pt-8">
        <label className="space-y-2">
          <span className="text-sm font-medium">Notes</span>
          <textarea
            name="notes"
            rows={5}
            defaultValue={item.notes ?? ""}
            className={`${inputClass} resize-none`}
          />
        </label>
      </section>

      <div className="flex justify-end gap-3 border-t border-slate-800 pt-6">
        <Link
          href={`/inventory/${item.id}`}
          className="rounded-xl border border-slate-700 px-4 py-2.5 font-medium text-slate-300 transition hover:bg-slate-800"
        >
          Cancel
        </Link>

        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-500"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>
    </form>
  );
}