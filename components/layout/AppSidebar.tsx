"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  ClipboardList,
  Home,
  Package,
  Settings,
} from "lucide-react";

import { primaryNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const icons = { Home, Inventory: ClipboardList, Storage: Package, Settings };

export function AppSidebar({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className={cn("w-72 border-r border-slate-800 bg-[#08111f] p-5", className)}>
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
        {primaryNavigation.map((item) => {
          const Icon = icons[item.label];

          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
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
