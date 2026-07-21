import { Bell } from "lucide-react";

import { GlobalSearch } from "@/components/layout/global-search";
import { AppSidebar } from "@/components/layout/AppSidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <div className="flex min-h-screen">
        <AppSidebar />

        <main className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-slate-800 px-8">
            <GlobalSearch />

            <div className="ml-6 flex items-center gap-4">
              <button
                type="button"
                aria-label="Notifications"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <Bell className="h-5 w-5" />
              </button>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-sm font-semibold">
                CJ
              </div>
            </div>
          </header>

          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}