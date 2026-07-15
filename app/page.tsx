import { AppShell } from "@/components/layout/AppShell";
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
    title: "Find an Item",
    subtitle: "Search your inventory",
    icon: Search,
  },
  {
    title: "Browse Storage",
    subtitle: "View all containers",
    icon: Box,
  },
];

const recentContainers = [
  {
    bin: "BIN-GARAGE-001",
    name: "Electrical Supplies",
    location: "Garage",
    updated: "Today",
  },
  {
    bin: "BIN-HOLIDAY-001",
    name: "Christmas Decorations",
    location: "Attic",
    updated: "Yesterday",
  },
  {
    bin: "BIN-CAMPING-001",
    name: "Camping Gear",
    location: "Garage",
    updated: "2 days ago",
  },
];

export default async function Home() {
  const [containerCount, inventoryCount, locationCount, categoryCount] =
    await Promise.all([
      prisma.container.count(),
      prisma.inventoryItem.count(),
      prisma.location.count(),
      prisma.category.count(),
    ]);

  const stats = [
    {
      label: "Containers",
      value: containerCount.toString(),
      icon: Box,
    },
    {
      label: "Inventory",
      value: inventoryCount.toString(),
      icon: FileText,
    },
    {
      label: "Locations",
      value: locationCount.toString(),
      icon: MapPin,
    },
    {
      label: "Categories",
      value: categoryCount.toString(),
      icon: Tag,
    },
  ];

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <p className="text-sm text-blue-400">Dashboard</p>

          <h1 className="mt-1 text-4xl font-bold">Welcome to BinVault</h1>

          <p className="mt-2 text-slate-400">
            Know what you own. Know where it is.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <Icon className="mb-4 h-8 w-8 text-blue-400" />

                <div className="text-3xl font-bold">{stat.value}</div>

                <div className="mt-1 text-slate-400">{stat.label}</div>
              </div>
            );
          })}
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.title}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-blue-500"
                >
                  <Icon className="mb-4 h-7 w-7 text-blue-400" />

                  <div className="font-semibold">{action.title}</div>

                  <div className="text-sm text-slate-400">
                    {action.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-5">
            <h2 className="text-xl font-semibold">
              Recently Updated Containers
            </h2>
          </div>

          {recentContainers.map((container) => (
            <div
              key={container.bin}
              className="flex items-center justify-between border-b border-slate-800 p-5 last:border-none"
            >
              <div>
                <div className="font-semibold">{container.bin}</div>

                <div className="text-slate-400">{container.name}</div>
              </div>

              <div className="text-slate-400">{container.location}</div>

              <div className="text-slate-500">{container.updated}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}