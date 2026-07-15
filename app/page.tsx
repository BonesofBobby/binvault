import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { prisma } from "@/lib/db/prisma";
import {
  Box,
  FileText,
  MapPin,
  Plus,
  QrCode,
  Search,
  Tag,
} from "lucide-react";

const quickActions = [
  {
    title: "New Container",
    subtitle: "Add a new storage container",
    icon: Plus,
  },
  {
    title: "Print QR Labels",
    subtitle: "Generate container labels",
    icon: QrCode,
  },
  {
    title: "Find Inventory",
    subtitle: "Search everything you own",
    icon: Search,
  },
  {
    title: "Browse Storage",
    subtitle: "View all containers",
    icon: Box,
  },
];

export default async function Home() {
  const [
    containerCount,
    inventoryCount,
    locationCount,
    categoryCount,
    recentContainers,
  ] = await Promise.all([
    prisma.container.count(),
    prisma.inventoryItem.count(),
    prisma.location.count(),
    prisma.category.count(),
    prisma.container.findMany({
      take: 5,
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        location: true,
        _count: {
          select: {
            inventoryItems: true,
          },
        },
      },
    }),
  ]);

  return (
    <AppShell>
      <div className="space-y-10">
        <PageHeader
          eyebrow="Home"
          title="Welcome Home"
          description="Your home's memory starts here. Search, organize, and manage everything your household owns."
        />

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <SectionHeader
            title="Find anything"
            description="Search by item, container, location, category, manufacturer, or serial number."
          />

          <div className="relative mt-5">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-12 py-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-blue-500"
              placeholder="What are you looking for?"
            />
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Containers"
            value={containerCount}
            icon={Box}
            href="/storage"
          />

          <MetricCard
            label="Inventory"
            value={inventoryCount}
            icon={FileText}
          />

          <MetricCard
            label="Locations"
            value={locationCount}
            icon={MapPin}
          />

          <MetricCard
            label="Categories"
            value={categoryCount}
            icon={Tag}
          />
        </section>

        <section className="space-y-5">
          <SectionHeader
            title="Quick Actions"
            description="Common ways to manage and find household information."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.title}
                  type="button"
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-blue-500 hover:bg-slate-800"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
                    <Icon className="h-6 w-6 text-blue-400" />
                  </div>

                  <p className="mt-5 font-semibold">{action.title}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {action.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-5">
            <SectionHeader
              title="Recently Updated"
              description="Containers with the most recent changes."
            />
          </div>

          {recentContainers.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              No recent container activity.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {recentContainers.map((container) => (
                <div
                  key={container.id}
                  className="grid gap-4 p-5 md:grid-cols-[1fr_auto_auto] md:items-center"
                >
                  <div>
                    <p className="font-semibold">{container.binNumber}</p>
                    <p className="text-sm text-slate-400">{container.name}</p>
                  </div>

                  <p className="text-sm text-slate-400">
                    {container.location?.name ?? "No location"}
                  </p>

                  <p className="text-sm text-slate-500">
                    {container._count.inventoryItems}{" "}
                    {container._count.inventoryItems === 1 ? "item" : "items"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}