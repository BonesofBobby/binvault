import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { updateContainerAction } from "@/app/storage/actions";
import { AppShell } from "@/components/layout/AppShell";
import { ContainerForm } from "@/components/storage/container-form";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import {
  getContainer,
  getContainerFormOptions,
} from "@/lib/services/container-service";

type EditContainerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditContainerPage({
  params,
}: EditContainerPageProps) {
  const { id } = await params;
  const containerId = Number(id);

  if (!Number.isInteger(containerId) || containerId <= 0) {
    notFound();
  }

  const [container, options] = await Promise.all([
    getContainer(containerId),
    getContainerFormOptions(),
  ]);

  if (!container) {
    notFound();
  }

  const action = updateContainerAction.bind(
    null,
    container.id,
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-8">
        <AppBreadcrumbs
          items={[
            {
              label: "Storage",
              href: "/storage",
            },
            {
              label: container.name,
              href: `/storage/${container.id}`,
            },
            {
              label: "Edit",
            },
          ]}
        />

        <Link
          href={`/storage/${container.id}`}
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {container.name}
        </Link>

        <PageHeader
          eyebrow={container.binNumber}
          title="Edit Container"
          description="Update this container without changing its inventory records."
        />

        <ContainerForm
          action={action}
          values={{
            binNumber: container.binNumber,
            name: container.name,
            description: container.description ?? "",
            notes: container.notes ?? "",
            locationId: container.locationId,
            containerTypeId: container.containerTypeId,
            status: container.status,
          }}
          locations={options.locations}
          containerTypes={options.containerTypes}
          cancelHref={`/storage/${container.id}`}
          submitLabel="Save Changes"
        />
      </div>
    </AppShell>
  );
}
