import { GlobalSearch } from "@/components/layout/global-search";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNavigation } from "@/components/layout/mobile-navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <div className="flex min-h-screen">
        <AppSidebar className="hidden shrink-0 lg:block" />

        <main className="min-w-0 flex-1">
          <header className="flex h-16 items-center gap-3 border-b border-slate-800 px-4 sm:px-6 lg:h-20 lg:px-8">
            <MobileNavigation />
            <GlobalSearch className="min-w-0" />
          </header>

          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
