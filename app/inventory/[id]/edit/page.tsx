import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { InventoryEditForm } from "@/components/inventory/inventory-edit-form";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db/prisma";
import { updateInventoryItem } from "./actions";

type EditInventoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function toDateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function EditInventoryPage({
  params,
}: EditInventoryPageProps) {
  const { id } = await params;
  const inventoryId = Number(id);

  if (!Number.isInteger(inventoryId)) {
    notFound();
  }

  const [item, categories, containers] = await Promise.all([
    prisma.inventoryItem.findUnique({
      where: {
        id: inventoryId,
      },
    }),
    prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
    }),
    prisma.container.findMany({
      orderBy: [
        {
          binNumber: "asc",
        },
      ],
      select: {
        id: true,
        binNumber: true,
        name: true,
      },
    }),
  ]);

  if (!item) {
    notFound();
  }

  const updateAction = updateInventoryItem.bind(null, item.id);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-8">
        <Link
          href={`/inventory/${item.id}`}
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inventory Details
        </Link>

        <PageHeader
          eyebrow="Edit Inventory"
          title={item.name}
          description="Update general information, storage placement, and type-specific details."
        />

        <InventoryEditForm
          item={{
            id: item.id,
            name: item.name,
            inventoryType: item.inventoryType,
            quantity: item.quantity,
            condition: item.condition,
            notes: item.notes,
            containerId: item.containerId,
            categoryId: item.categoryId,
            manufacturer: item.manufacturer,
            modelNumber: item.modelNumber,
            serialNumber: item.serialNumber,
            purchaseDate: toDateInput(item.purchaseDate),
            purchasePrice: item.purchasePrice,
            warrantyEnd: toDateInput(item.warrantyEnd),
            partNumber: item.partNumber,
            replacementIntervalDays:
              item.replacementIntervalDays,
            minimumQuantity: item.minimumQuantity,
            documentType: item.documentType,
            expirationDate: toDateInput(item.expirationDate),
          }}
          categories={categories}
          containers={containers}
          action={updateAction}
        />
      </div>
    </AppShell>
  );
}