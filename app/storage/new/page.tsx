import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createContainerAction } from "@/app/storage/actions";
import { AppShell } from "@/components/layout/AppShell";
import { ContainerForm } from "@/components/storage/container-form";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { getContainerFormOptions } from "@/lib/services/container-service";

export default async function NewContainerPage() {
  const { locations, containerTypes } =
    await getContainerFormOptions();

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
              label: "New Container",
            },
          ]}
        />

        <Link
          href="/storage"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Storage
        </Link>

        <PageHeader
          eyebrow="Storage"
          title="Create Container"
          description="Add a storage container and assign it to an existing location."
        />

        <ContainerForm
          action={createContainerAction}
          values={{
            binNumber: "",
            name: "",
            description: "",
            notes: "",
            locationId: null,
            containerTypeId: null,
            status: "EMPTY",
          }}
          locations={locations}
          containerTypes={containerTypes}
          cancelHref="/storage"
          submitLabel="Create Container"
        />
      </div>
    </AppShell>
  );
}
