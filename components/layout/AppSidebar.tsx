"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  ClipboardList,
  FileText,
  Home,
  Package,
  QrCode,
  Settings,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Home",
    href: "/",
    icon: Home,
    enabled: true,
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: ClipboardList,
    enabled: true,
  },
  {
    label: "Storage",
    href: "/storage",
    icon: Package,
    enabled: true,
  },
  {
    label: "QR Labels",
    href: "/qr-labels",
    icon: QrCode,
    enabled: false,
    comingSoon: true,
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FileText,
    enabled: false,
    comingSoon: true,
  },
  {
    label: "Maintenance",
    href: "/maintenance",
    icon: Wrench,
    enabled: false,
    comingSoon: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    enabled: false,
    comingSoon: true,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 border-r border-slate-800 bg-[#08111f] p-5">
      <Link href="/" className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
          <Box className="h-6 w-6 text-white" />
        </div>

        <div>
          <h1 className="text-lg font-bold">BinVault</h1>
          <p className="text-xs text-blue-400">
            Know what you own. Know where it is.
          </p>
        </div>
      </Link>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

          if (!item.enabled) {
            return (
              <div
                key={item.label}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-600"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>

                {item.comingSoon && (
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-500">
                    Soon
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}