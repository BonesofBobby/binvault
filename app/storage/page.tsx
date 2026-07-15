import Link from "next/link";
import { Box, MapPin, PackageOpen, Plus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { ContainerStatusBadge } from "@/components/storage/container-status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db/prisma";

export default async function StoragePage() {
  const containers = await prisma.container.findMany({
    include: {
      location: true,
      containerType: true,
      _count: {
        select: {
          inventoryItems: true,
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
          eyebrow="Storage"
          title="Containers"
          description="Browse and manage every container in your home."
          actions={
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-500">
              <Plus className="h-4 w-4" />
              New Container
            </button>
          }
        />

        {containers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-12 text-center">
            <PackageOpen className="mx-auto h-10 w-10 text-slate-500" />

            <h2 className="mt-4 text-xl font-semibold">
              No containers yet
            </h2>

            <p className="mt-2 text-slate-400">
              Add your first container to begin organizing your storage.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {containers.map((container) => (
              <article
                key={container.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-blue-500"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/15">
                    <Box className="h-6 w-6 text-blue-400" />
                  </div>

                  <ContainerStatusBadge status={container.status} />
                </div>

                <div className="mt-5">
                  <p className="text-sm font-medium text-blue-400">
                    {container.binNumber}
                  </p>

                  <h2 className="mt-1 text-xl font-semibold">
                    {container.name}
                  </h2>

                  {container.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                      {container.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 space-y-2 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {container.location?.name ?? "No location"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    <span>
                      {container.containerType?.name ??
                        "No container type"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
                  <span className="text-sm text-slate-400">
                    {container._count.inventoryItems}{" "}
                    {container._count.inventoryItems === 1
                      ? "item"
                      : "items"}
                  </span>

                  <Link
                    href={`/storage/${container.id}`}
                    className="text-sm font-medium text-blue-400 transition hover:text-blue-300"
                  >
                    Open Container →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}