import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Box,
  MapPin,
  PackagePlus,
  QrCode,
  Tag,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db/prisma";

type ContainerDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ContainerDetailPage({
  params,
}: ContainerDetailPageProps) {
  const { id } = await params;
  const containerId = Number(id);

  if (!Number.isInteger(containerId)) {
    notFound();
  }

  const container = await prisma.container.findUnique({
    where: {
      id: containerId,
    },
    include: {
      location: true,
      containerType: true,
      inventoryItems: {
        include: {
          category: true,
        },
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  if (!container) {
    notFound();
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <Link
          href="/storage"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Storage
        </Link>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-400">
                {container.binNumber}
              </p>

              <h1 className="mt-2 text-4xl font-bold">{container.name}</h1>

              {container.description && (
                <p className="mt-3 max-w-3xl text-slate-400">
                  {container.description}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1.5 text-slate-300">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  {container.location?.name ?? "No location"}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1.5 text-slate-300">
                  <Box className="h-4 w-4 text-blue-400" />
                  {container.containerType?.name ?? "No container type"}
                </span>

                <span className="rounded-full bg-slate-800 px-3 py-1.5 text-slate-300">
                  {container.status}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 font-medium text-slate-200 transition hover:border-blue-500 hover:bg-slate-800">
                <QrCode className="h-4 w-4" />
                QR Label
              </button>

              <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-500">
                <PackagePlus className="h-4 w-4" />
                Add Inventory
              </button>
            </div>
          </div>

          {container.notes && (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Notes
              </p>
              <p className="mt-2 text-sm text-slate-300">{container.notes}</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 p-5">
            <div>
              <h2 className="text-xl font-semibold">Inventory</h2>
              <p className="mt-1 text-sm text-slate-400">
                {container.inventoryItems.length}{" "}
                {container.inventoryItems.length === 1 ? "entry" : "entries"}
              </p>
            </div>
          </div>

          {container.inventoryItems.length === 0 ? (
            <div className="p-12 text-center">
              <PackagePlus className="mx-auto h-10 w-10 text-slate-500" />
              <h3 className="mt-4 text-lg font-semibold">
                This container is empty
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Add the first inventory entry to begin cataloging its contents.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {container.inventoryItems.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-4 p-5 md:grid-cols-[1fr_auto_auto] md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{item.name}</h3>

                      <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300">
                        {item.inventoryType.replaceAll("_", " ")}
                      </span>
                    </div>

                    {item.notes && (
                      <p className="mt-2 text-sm text-slate-400">{item.notes}</p>
                    )}
                  </div>

                  <div className="text-sm text-slate-400">
                    <p>Quantity: {item.quantity}</p>
                    <p>Condition: {item.condition ?? "Not specified"}</p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Tag className="h-4 w-4" />
                    {item.category?.name ?? "Uncategorized"}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}