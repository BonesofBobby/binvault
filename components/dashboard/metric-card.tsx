import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  href,
}: MetricCardProps) {
  const card = (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-blue-500">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
          <Icon className="h-6 w-6 text-blue-400" />
        </div>

        {href && <span className="text-xs text-slate-500">View all →</span>}
      </div>

      <p className="mt-5 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{label}</p>
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}