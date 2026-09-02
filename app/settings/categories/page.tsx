import Link from "next/link";
import { FolderTree } from "lucide-react";

import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "@/app/settings/actions";
import { AppShell } from "@/components/layout/AppShell";
import { ReferenceDataDeleteControl } from "@/components/settings/reference-data-delete-control";
import { ReferenceDataForm } from "@/components/settings/reference-data-form";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { getCategory, listCategories } from "@/lib/services/reference-data-service";

type Props = { searchParams: Promise<{ edit?: string }> };

export default async function CategoriesSettingsPage({ searchParams }: Props) {
  const { edit } = await searchParams;
  const editId = edit ? Number(edit) : null;
  const [categories, editing] = await Promise.all([
    listCategories(),
    editId && Number.isInteger(editId) ? getCategory(editId) : Promise.resolve(null),
  ]);
  const formAction = editing ? updateCategoryAction.bind(null, editing.id) : createCategoryAction;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8">
        <AppBreadcrumbs items={[{ label: "Settings", href: "/settings" }, { label: "Categories" }]} />
        <PageHeader eyebrow="Settings" title="Categories" description="Categories are optional. Inventory can remain Uncategorized, and categories in use cannot be deleted." />
        <Card className="border border-slate-800 bg-slate-900">
          <CardHeader><CardTitle>{editing ? `Edit ${editing.name}` : "Create category"}</CardTitle><CardDescription>Examples: Electronics, Tools, Documents, or Maintenance.</CardDescription></CardHeader>
          <CardContent><ReferenceDataForm action={formAction} defaultName={editing?.name} submitLabel={editing ? "Save Category" : "Create Category"} cancelHref={editing ? "/settings/categories" : undefined} /></CardContent>
        </Card>
        {categories.length === 0 ? (
          <Empty className="border border-slate-800 bg-slate-900"><EmptyHeader><EmptyMedia variant="icon"><FolderTree /></EmptyMedia><EmptyTitle>No categories yet</EmptyTitle><EmptyDescription>Create one above, or leave inventory Uncategorized.</EmptyDescription></EmptyHeader></Empty>
        ) : (
          <div className="space-y-3">{categories.map((category) => (
            <Card key={category.id} className="border border-slate-800 bg-slate-900"><CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{category.name}</p><p className="text-sm text-slate-400">Used by {category._count.inventoryItems} inventory {category._count.inventoryItems === 1 ? "record" : "records"}</p></div><div className="flex items-start gap-2"><Link href={`/settings/categories?edit=${category.id}`} className="inline-flex h-7 items-center rounded-lg border border-slate-700 px-2.5 text-xs font-medium hover:bg-slate-800">Edit</Link><ReferenceDataDeleteControl action={deleteCategoryAction.bind(null, category.id)} label={category.name} /></div></CardContent></Card>
          ))}</div>
        )}
      </div>
    </AppShell>
  );
}
