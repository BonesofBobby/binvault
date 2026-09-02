import Link from "next/link";
import { Boxes } from "lucide-react";

import { createContainerTypeAction, deleteContainerTypeAction, updateContainerTypeAction } from "@/app/settings/actions";
import { AppShell } from "@/components/layout/AppShell";
import { ReferenceDataDeleteControl } from "@/components/settings/reference-data-delete-control";
import { ReferenceDataForm } from "@/components/settings/reference-data-form";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { getContainerType, listContainerTypes } from "@/lib/services/reference-data-service";

type Props = { searchParams: Promise<{ edit?: string }> };

export default async function ContainerTypesSettingsPage({ searchParams }: Props) {
  const { edit } = await searchParams;
  const editId = edit ? Number(edit) : null;
  const [containerTypes, editing] = await Promise.all([
    listContainerTypes(),
    editId && Number.isInteger(editId) ? getContainerType(editId) : Promise.resolve(null),
  ]);
  const formAction = editing ? updateContainerTypeAction.bind(null, editing.id) : createContainerTypeAction;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8">
        <AppBreadcrumbs items={[{ label: "Settings", href: "/settings" }, { label: "Container Types" }]} />
        <PageHeader eyebrow="Settings" title="Container Types" description="Create reusable labels for the kinds of containers you own. Types in use cannot be deleted." />
        <Card className="border border-slate-800 bg-slate-900">
          <CardHeader><CardTitle>{editing ? `Edit ${editing.name}` : "Create container type"}</CardTitle><CardDescription>Examples: Plastic Tote, Cabinet, Shelf, or Safe.</CardDescription></CardHeader>
          <CardContent><ReferenceDataForm action={formAction} defaultName={editing?.name} submitLabel={editing ? "Save Container Type" : "Create Container Type"} cancelHref={editing ? "/settings/container-types" : undefined} /></CardContent>
        </Card>
        {containerTypes.length === 0 ? (
          <Empty className="border border-slate-800 bg-slate-900"><EmptyHeader><EmptyMedia variant="icon"><Boxes /></EmptyMedia><EmptyTitle>No container types yet</EmptyTitle><EmptyDescription>Create a type above before adding your first container.</EmptyDescription></EmptyHeader></Empty>
        ) : (
          <div className="space-y-3">{containerTypes.map((type) => (
            <Card key={type.id} className="border border-slate-800 bg-slate-900"><CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{type.name}</p><p className="text-sm text-slate-400">Used by {type._count.containers} {type._count.containers === 1 ? "container" : "containers"}</p></div><div className="flex items-start gap-2"><Link href={`/settings/container-types?edit=${type.id}`} className="inline-flex h-7 items-center rounded-lg border border-slate-700 px-2.5 text-xs font-medium hover:bg-slate-800">Edit</Link><ReferenceDataDeleteControl action={deleteContainerTypeAction.bind(null, type.id)} label={type.name} /></div></CardContent></Card>
          ))}</div>
        )}
      </div>
    </AppShell>
  );
}
