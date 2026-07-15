import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Box,
  CalendarDays,
  DollarSign,
  Edit,
  Hash,
  MapPin,
  Package,
  QrCode,
  Tag,
  Trash2,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { prisma } from "@/lib/db/prisma";

type InventoryDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value: Date | null) {
  if (!value) {
    return "Not specified";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatCurrency(value: number | null) {
  if (value === null) {
    return "Not specified";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default async function InventoryDetailPage({
  params,
}: InventoryDetailPageProps) {
  const { id } = await params;
  const inventoryId = Number(id);

  if (!Number.isInteger(inventoryId)) {
    notFound();
  }

  const item = await prisma.inventoryItem.findUnique({
    where: {
      id: inventoryId,
    },
    include: {
      category: true,
      container: {
        include: {
          location: true,
          containerType: true,
        },
      },
    },
  });

  if (!item) {
    notFound();
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inventory
        </Link>

        <PageHeader
          eyebrow={item.inventoryType.replaceAll("_", " ")}
          title={item.name}
          description="View inventory details, storage location, and type-specific information."
          actions={
            <>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 font-medium text-slate-200 transition hover:border-blue-500 hover:bg-slate-800"
              >
                <QrCode className="h-4 w-4" />
                QR Code
              </button>

             <Link
  href={`/inventory/${item.id}/edit`}
  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-500"
>
  <Edit className="h-4 w-4" />
  Edit
</Link>
            </>
          }
        />

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
            <SectionHeader
              title="General Information"
              description="Core details associated with this inventory record."
            />

            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Quantity
                </dt>
                <dd className="mt-2 text-lg font-semibold">{item.quantity}</dd>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Condition
                </dt>
                <dd className="mt-2 text-lg font-semibold">
                  {item.condition ?? "Not specified"}
                </dd>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Category
                </dt>
                <dd className="mt-2 flex items-center gap-2 text-lg font-semibold">
                  <Tag className="h-4 w-4 text-blue-400" />
                  {item.category?.name ?? "Uncategorized"}
                </dd>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Inventory Type
                </dt>
                <dd className="mt-2 text-lg font-semibold">
                  {item.inventoryType.replaceAll("_", " ")}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <SectionHeader
              title="Storage"
              description="Where this inventory is currently stored."
            />

            <div className="mt-6 space-y-5">
              <div className="flex items-start gap-3">
                <Package className="mt-0.5 h-5 w-5 text-blue-400" />
                <div>
                  <p className="font-semibold">{item.container.name}</p>
                  <Link
                    href={`/storage/${item.container.id}`}
                    className="text-sm text-blue-400 transition hover:text-blue-300"
                  >
                    {item.container.binNumber}
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-blue-400" />
                <div>
                  <p className="font-semibold">
                    {item.container.location?.name ?? "No location"}
                  </p>
                  <p className="text-sm text-slate-400">Location</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Box className="mt-0.5 h-5 w-5 text-blue-400" />
                <div>
                  <p className="font-semibold">
                    {item.container.containerType?.name ?? "No container type"}
                  </p>
                  <p className="text-sm text-slate-400">Container type</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {item.inventoryType === "ASSET" && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <SectionHeader
              title="Asset Information"
              description="Manufacturer, identification, purchase, and warranty details."
            />

            <dl className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Manufacturer
                </dt>
                <dd className="mt-2 font-semibold">
                  {item.manufacturer ?? "Not specified"}
                </dd>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Model Number
                </dt>
                <dd className="mt-2 flex items-center gap-2 font-semibold">
                  <Hash className="h-4 w-4 text-blue-400" />
                  {item.modelNumber ?? "Not specified"}
                </dd>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Serial Number
                </dt>
                <dd className="mt-2 font-semibold">
                  {item.serialNumber ?? "Not specified"}
                </dd>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Purchase Date
                </dt>
                <dd className="mt-2 flex items-center gap-2 font-semibold">
                  <CalendarDays className="h-4 w-4 text-blue-400" />
                  {formatDate(item.purchaseDate)}
                </dd>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Purchase Price
                </dt>
                <dd className="mt-2 flex items-center gap-2 font-semibold">
                  <DollarSign className="h-4 w-4 text-blue-400" />
                  {formatCurrency(item.purchasePrice)}
                </dd>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Warranty End
                </dt>
                <dd className="mt-2 font-semibold">
                  {formatDate(item.warrantyEnd)}
                </dd>
              </div>
            </dl>
          </section>
        )}

        {item.inventoryType === "CONSUMABLE" && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <SectionHeader
              title="Consumable Information"
              description="Part number, reorder threshold, and replacement interval."
            />

            <dl className="mt-6 grid gap-5 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Part Number
                </dt>
                <dd className="mt-2 font-semibold">
                  {item.partNumber ?? "Not specified"}
                </dd>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Minimum Quantity
                </dt>
                <dd className="mt-2 font-semibold">
                  {item.minimumQuantity ?? "Not specified"}
                </dd>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Replacement Interval
                </dt>
                <dd className="mt-2 font-semibold">
                  {item.replacementIntervalDays
                    ? `${item.replacementIntervalDays} days`
                    : "Not specified"}
                </dd>
              </div>
            </dl>
          </section>
        )}

        {item.inventoryType === "DOCUMENT" && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <SectionHeader
              title="Document Information"
              description="Document classification and expiration details."
            />

            <dl className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Document Type
                </dt>
                <dd className="mt-2 font-semibold">
                  {item.documentType ?? "Not specified"}
                </dd>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Expiration Date
                </dt>
                <dd className="mt-2 font-semibold">
                  {formatDate(item.expirationDate)}
                </dd>
              </div>
            </dl>
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <SectionHeader
            title="Notes"
            description="Additional information associated with this inventory record."
          />

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-slate-300">
            {item.notes ?? "No notes have been added."}
          </div>
        </section>

        <section className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 font-medium text-red-300 transition hover:bg-red-500/20"
          >
            <Trash2 className="h-4 w-4" />
            Delete Inventory
          </button>
        </section>
      </div>
    </AppShell>
  );
}