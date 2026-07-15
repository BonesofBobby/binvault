import Link from "next/link";
import { ArrowLeft, PackagePlus } from "lucide-react";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db/prisma";
import { createInventoryItem } from "./actions";

type NewInventoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewInventoryPage({
  params,
}: NewInventoryPageProps) {
  const { id } = await params;
  const containerId = Number(id);

  if (!Number.isInteger(containerId)) {
    notFound();
  }

  const [container, categories] = await Promise.all([
    prisma.container.findUnique({
      where: { id: containerId },
      select: {
        id: true,
        binNumber: true,
        name: true,
      },
    }),
    prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  if (!container) {
    notFound();
  }

  const createInventoryItemForContainer =
    createInventoryItem.bind(null, container.id);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-8">
        <Link
          href={`/storage/${container.id}`}
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {container.binNumber}
        </Link>

        <div>
          <p className="text-sm text-blue-400">Add Inventory</p>
          <h1 className="mt-1 text-4xl font-bold">
            Add item to {container.name}
          </h1>
          <p className="mt-2 text-slate-400">
            Enter the information for the item stored in this container.
          </p>
        </div>

        <form
          action={createInventoryItemForContainer}
          className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Item name</span>
              <input
                name="name"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="Example: HDMI Cable"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Inventory type</span>
              <select
                name="inventoryType"
                defaultValue="STANDARD_ITEM"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
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
                defaultValue="1"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Category</span>
              <select
                name="categoryId"
                defaultValue=""
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
              >
                <option value="">Uncategorized</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Condition</span>
              <input
                name="condition"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="Example: New, Good, Fair"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Notes</span>
              <textarea
                name="notes"
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="Optional details about the item"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-800 pt-6">
            <Link
              href={`/storage/${container.id}`}
              className="rounded-xl border border-slate-700 px-4 py-2.5 font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-500"
            >
              <PackagePlus className="h-4 w-4" />
              Save Inventory
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}