import Link from "next/link";
import {
  Boxes,
  ClipboardList,
  MapPin,
  Package,
  Tag,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db/prisma";

export default async function InventoryPage() {
  const inventoryItems = await prisma.inventoryItem.findMany({
    include: {
      category: true,
      container: {
        include: {
          location: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return (
    <AppShell>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Inventory"
          title="Everything You Own"
          description="Browse household inventory and see exactly where each item is stored."
        />

        {inventoryItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-12 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-slate-500" />

            <h2 className="mt-4 text-xl font-semibold">
              No inventory yet
            </h2>

            <p className="mt-2 text-slate-400">
              Add inventory from a container to begin building your household catalog.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="hidden grid-cols-[2fr_1fr_100px_1fr_1fr] gap-4 border-b border-slate-800 px-5 py-4 text-xs font-medium uppercase tracking-wide text-slate-500 md:grid">
              <span>Inventory</span>
              <span>Type</span>
              <span>Quantity</span>
              <span>Container</span>
              <span>Location</span>
            </div>

            <div className="divide-y divide-slate-800">
              {inventoryItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/inventory/${item.id}`}
                  className="grid gap-4 p-5 transition hover:bg-slate-800/40 md:grid-cols-[2fr_1fr_100px_1fr_1fr] md:items-center"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                        <Boxes className="h-5 w-5 text-blue-400" />
                      </div>

                      <div>
                        <h2 className="font-semibold">{item.name}</h2>

                        <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                          <Tag className="h-3.5 w-3.5" />
                          {item.category?.name ?? "Uncategorized"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                      {item.inventoryType.replaceAll("_", " ")}
                    </span>
                  </div>

                  <p className="text-sm text-slate-300">
                    {item.quantity}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Package className="h-4 w-4 text-slate-500" />

                    <div>
                      <p>{item.container.name}</p>
                      <p className="text-xs text-blue-400">
                        {item.container.binNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <MapPin className="h-4 w-4" />
                    {item.container.location?.name ?? "No location"}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}