import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { moveInventoryItemAction } from "@/app/inventory/actions";
import { AppShell } from "@/components/layout/AppShell";
import { InventoryMoveForm } from "@/components/inventory/inventory-move-form";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import {
  InventoryNotFoundError,
  inventoryLifecycleService,
} from "@/lib/services/inventory-lifecycle-service";

type MoveInventoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MoveInventoryPage({
  params,
}: MoveInventoryPageProps) {
  const { id } = await params;
  const inventoryId = Number(id);

  if (!Number.isInteger(inventoryId) || inventoryId <= 0) {
    notFound();
  }

  let moveOptions;

  try {
    moveOptions =
      await inventoryLifecycleService.getMoveOptions(inventoryId);
  } catch (error) {
    if (error instanceof InventoryNotFoundError) {
      notFound();
    }
    throw error;
  }

  const action = moveInventoryItemAction.bind(null, inventoryId);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-8">
        <AppBreadcrumbs
          items={[
            {
              label: "Inventory",
              href: "/inventory",
            },
            {
              label: moveOptions.item.name,
              href: `/inventory/${inventoryId}`,
            },
            {
              label: "Move",
            },
          ]}
        />
        <Link
          href={`/inventory/${inventoryId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inventory Details
        </Link>
        <PageHeader
          eyebrow="Inventory Lifecycle"
          title={`Move ${moveOptions.item.name}`}
          description="Choose a different existing container for this inventory item."
        />
        <InventoryMoveForm
          action={action}
          inventoryId={inventoryId}
          currentContainer={moveOptions.item.container}
          destinations={moveOptions.destinations}
        />
      </div>
    </AppShell>
  );
}
