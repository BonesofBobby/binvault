import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { DownloadControl } from "./download-control";

export default function BackupPage() {
  return <AppShell><div className="mx-auto max-w-4xl space-y-6">
    <AppBreadcrumbs items={[{ label: "Settings", href: "/settings" }, { label: "Backup & Recovery" }]} />
    <PageHeader eyebrow="Settings" title="Backup & Recovery"
      description="Download a portable copy of your inventory, settings, activity history, and managed uploads." />
    <div className="space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <p>Store downloaded backups somewhere separate from this BinVault installation. Keep more than one copy.</p>
      <DownloadControl />
      <p className="text-sm text-slate-300">Restore is a maintenance operation. Stop BinVault before using the recovery command. There is no live restore in Settings.</p>
      <p className="text-sm text-slate-300">To validate: <code>npm run recovery:validate -- /path/to/backup.zip</code></p>
      <p className="text-sm text-slate-300">To restore after stopping BinVault: <code>npm run recovery:restore -- /path/to/backup.zip --confirm-stopped</code></p>
      <Link href="/settings" className="text-blue-300 underline">Back to Settings</Link>
    </div>
  </div></AppShell>;
}
