import { Bell, Search } from "lucide-react";

import { AppSidebar } from "@/components/layout/AppSidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <div className="flex min-h-screen">
        <AppSidebar />

        <main className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-slate-800 px-8">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />

              <input
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-10 py-2.5 text-sm outline-none placeholder:text-slate-500 focus:border-blue-500"
                placeholder="Search anything..."
              />
            </div>

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