import Link from "next/link";
import { Boxes, FolderTree, MapPin } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const sections = [
  {
    href: "/settings/locations",
    title: "Locations",
    description: "Describe where containers live, including simple parent and child locations.",
    icon: MapPin,
  },
  {
    href: "/settings/container-types",
    title: "Container Types",
    description: "Maintain reusable types such as tote, cabinet, shelf, or safe.",
    icon: Boxes,
  },
  {
    href: "/settings/categories",
    title: "Categories",
    description: "Organize inventory with optional reusable categories.",
    icon: FolderTree,
  },
];

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8">
        <AppBreadcrumbs items={[{ label: "Settings" }]} />
        <PageHeader
          eyebrow="Settings"
          title="Organize BinVault"
          description="Create the reusable locations, container types, and categories that make storage and inventory consistent. Fresh installations can start here without running seed data."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {sections.map(({ href, title, description, icon: Icon }) => (
            <Link key={href} href={href} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <Card className="h-full border border-slate-800 bg-slate-900 transition hover:border-slate-700 hover:bg-slate-900/80">
                <CardHeader>
                  <Icon className="mb-2 h-5 w-5 text-blue-400" aria-hidden="true" />
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto text-sm font-medium text-blue-300">
                  Manage {title.toLowerCase()} →
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
