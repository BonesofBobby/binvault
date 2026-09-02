import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { InventoryEditForm } from "@/components/inventory/inventory-edit-form";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db/prisma";
import { createInventoryItem } from "./actions";

type NewInventoryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewInventoryPage({ params }: NewInventoryPageProps) {
  const { id } = await params;
  const containerId = Number(id);
  if (!Number.isInteger(containerId) || containerId <= 0) notFound();

  const [container, categories] = await Promise.all([
    prisma.container.findUnique({
      where: { id: containerId },
      select: { id: true, binNumber: true, name: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!container) notFound();

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-8">
        <Link href={`/storage/${container.id}`} className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to {container.binNumber}
        </Link>
        <PageHeader
          eyebrow="Add Inventory"
          title={`Add item to ${container.name}`}
          description="Enter general information and any details specific to this inventory type."
        />
        <InventoryEditForm
          initialValues={{
            name: "",
            inventoryType: "STANDARD_ITEM",
            quantity: "1",
            categoryId: "",
            condition: "",
            notes: "",
            manufacturer: "",
            modelNumber: "",
            serialNumber: "",
            purchaseDate: "",
            purchasePrice: "",
            warrantyEnd: "",
            partNumber: "",
            replacementIntervalDays: "",
            minimumQuantity: "",
            documentType: "",
            expirationDate: "",
          }}
          categories={categories}
          action={createInventoryItem.bind(null, container.id)}
          cancelHref={`/storage/${container.id}`}
          submitLabel="Create Inventory"
        />
      </div>
    </AppShell>
  );
}
