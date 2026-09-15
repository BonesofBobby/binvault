"use client";

import { useState } from "react";

type Summary = {
  token: string;
  createdAt: string;
  mediaCount: number;
  mediaBytes: number;
  missingReferencedMediaCount: number;
  unreferencedManagedMediaCount: number;
  counts: Record<string, number>;
};

export function DownloadControl() {
  const [pending, setPending] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  async function prepare() {
    setPending(true); setError(""); setSummary(null);
    try {
      const response = await fetch("/api/backup", { method: "POST", cache: "no-store" });
      if (!response.ok) throw new Error("Unable to create backup. Please try again.");
      setSummary(await response.json() as Summary);
    } catch {
      setError("Unable to create backup. Please try again.");
    } finally { setPending(false); }
  }
  return <div className="space-y-3">
    <button type="button" onClick={prepare} disabled={pending}
      className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-wait disabled:opacity-60">
      {pending ? "Preparing backup…" : "Create backup"}
    </button>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {summary && <div role="status" className="space-y-2 text-sm text-slate-300">
      <p>Backup ready. {summary.counts.inventory} inventory items, {summary.mediaCount} managed files ({(summary.mediaBytes / 1024 ** 2).toFixed(1)} MiB).</p>
      {summary.missingReferencedMediaCount > 0 && <p className="text-amber-300">
        Warning: {summary.missingReferencedMediaCount} database-referenced media files were missing. The backup records this warning.
      </p>}
      {summary.unreferencedManagedMediaCount > 0 && <p>{summary.unreferencedManagedMediaCount} unreferenced managed files were preserved.</p>}
      <a href={`/api/backup?token=${encodeURIComponent(summary.token)}`}
        className="inline-flex rounded-lg border border-blue-400 px-4 py-2 font-medium text-blue-300 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">
        Download prepared ZIP
      </a>
      <p>The prepared download expires after 15 minutes. Create another backup if it expires.</p>
    </div>}
  </div>;
}
