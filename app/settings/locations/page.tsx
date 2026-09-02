import Link from "next/link";
import { MapPin } from "lucide-react";

import {
  createLocationAction,
  deleteLocationAction,
  updateLocationAction,
} from "@/app/settings/actions";
import { AppShell } from "@/components/layout/AppShell";
import { ReferenceDataDeleteControl } from "@/components/settings/reference-data-delete-control";
import { ReferenceDataForm } from "@/components/settings/reference-data-form";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { getLocation, listLocations } from "@/lib/services/reference-data-service";

type Props = { searchParams: Promise<{ edit?: string }> };

export default async function LocationsSettingsPage({ searchParams }: Props) {
  const { edit } = await searchParams;
  const editId = edit ? Number(edit) : null;
  const [locations, editing] = await Promise.all([
    listLocations(),
    editId && Number.isInteger(editId) ? getLocation(editId) : Promise.resolve(null),
  ]);

  const parentById = new Map(locations.map((location) => [location.id, location.parentId]));
  const isEditingDescendant = (candidateId: number) => {
    if (!editing) return false;
    let parentId = parentById.get(candidateId) ?? null;
    const seen = new Set<number>();
    while (parentId !== null && !seen.has(parentId)) {
      if (parentId === editing.id) return true;
      seen.add(parentId);
      parentId = parentById.get(parentId) ?? null;
    }
    return false;
  };
  const parentOptions = locations
    .filter((location) => location.id !== editing?.id && !isEditingDescendant(location.id))
    .map((location) => ({
      id: location.id,
      label: `${"— ".repeat(location.depth)}${location.name}`,
    }));
  const formAction = editing
    ? updateLocationAction.bind(null, editing.id)
    : createLocationAction;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8">
        <AppBreadcrumbs items={[{ label: "Settings", href: "/settings" }, { label: "Locations" }]} />
        <PageHeader eyebrow="Settings" title="Locations" description="Use a simple hierarchy to describe where containers are stored. A location with containers or child locations cannot be deleted." />

        <Card className="border border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle>{editing ? `Edit ${editing.name}` : "Create location"}</CardTitle>
            <CardDescription>Names are required. Parent locations are optional.</CardDescription>
          </CardHeader>
          <CardContent>
            <ReferenceDataForm
              action={formAction}
              defaultName={editing?.name}
              defaultParentId={editing?.parentId}
              parentOptions={parentOptions}
              submitLabel={editing ? "Save Location" : "Create Location"}
              cancelHref={editing ? "/settings/locations" : undefined}
            />
          </CardContent>
        </Card>

        {locations.length === 0 ? (
          <Empty className="border border-slate-800 bg-slate-900">
            <EmptyHeader>
              <EmptyMedia variant="icon"><MapPin /></EmptyMedia>
              <EmptyTitle>No locations yet</EmptyTitle>
              <EmptyDescription>Create a location above, such as Home, Garage, or Office.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            {locations.map((location) => (
              <Card key={location.id} className="border border-slate-800 bg-slate-900">
                <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between" style={{ paddingLeft: `${1 + Math.min(location.depth, 4) * 1.25}rem` }}>
                  <div>
                    <p className="font-medium">{location.name}</p>
                    <p className="text-sm text-slate-400">
                      {location.parent ? `Inside ${location.parent.name} · ` : "Top level · "}
                      {location._count.containers} {location._count.containers === 1 ? "container" : "containers"} · {location._count.children} {location._count.children === 1 ? "child" : "children"}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Link href={`/settings/locations?edit=${location.id}`} className="inline-flex h-7 items-center rounded-lg border border-slate-700 px-2.5 text-xs font-medium hover:bg-slate-800">Edit</Link>
                    <ReferenceDataDeleteControl action={deleteLocationAction.bind(null, location.id)} label={location.name} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
