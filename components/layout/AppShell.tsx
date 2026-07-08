import {
  Bell,
  Box,
  FileText,
  Home,
  Package,
  QrCode,
  Search,
  Settings,
  Wrench,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: Home, active: true },
  { label: "Storage", icon: Package, active: false },
  { label: "QR Labels", icon: QrCode, active: false },
  { label: "Documents", icon: FileText, active: false, comingSoon: true },
  { label: "Maintenance", icon: Wrench, active: false, comingSoon: true },
  { label: "Settings", icon: Settings, active: false },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-slate-800 bg-[#08111f] p-5">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <Box className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">BinVault</h1>
              <p className="text-xs text-blue-400">Know what you own.</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    item.active
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>

                  {item.comingSoon && (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                      Soon
                    </span>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1">
          <header className="flex h-20 items-center justify-between border-b border-slate-800 px-8">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-10 py-2.5 text-sm outline-none placeholder:text-slate-500 focus:border-blue-500"
                placeholder="Search anything..."
              />
            </div>

            <div className="flex items-center gap-4">
              <Bell className="h-5 w-5 text-slate-400" />
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