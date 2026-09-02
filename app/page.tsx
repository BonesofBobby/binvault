import { AttentionCenter } from "@/components/dashboard/attention-center";
import { DashboardInsights } from "@/components/dashboard/dashboard-insights";
import { DashboardSummaryCards } from "@/components/dashboard/dashboard-summary-cards";
import { RecentlyAdded } from "@/components/dashboard/recently-added";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StorageUtilization } from "@/components/dashboard/storage-utilization";
import { AppShell } from "@/components/layout/AppShell";
import { GlobalSearch } from "@/components/layout/global-search";
import { PageHeader } from "@/components/ui/page-header";
import { dashboardService } from "@/lib/services/dashboard/dashboard-service";

function formatGeneratedTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function Home() {
  const dashboard = await dashboardService.getDashboardData();

  return (
    <AppShell>
      <div className="space-y-10">
        <div className="space-y-2">
          <PageHeader
            eyebrow="Home"
            title="Welcome Home"
            description="Your home's memory starts here. Search, organize, and manage everything your household owns."
          />

          <p className="text-xs text-muted-foreground">
            Dashboard updated {formatGeneratedTime(dashboard.generatedAt)}
          </p>
        </div>

        <section
          aria-labelledby="dashboard-search-heading"
          className="rounded-2xl border bg-card p-6 text-card-foreground shadow-sm"
        >
          <div>
            <h2
              id="dashboard-search-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Find anything
            </h2>

            <p className="text-sm text-muted-foreground">
              Search by item, container, location, category, manufacturer,
              model, or serial number.
            </p>
          </div>

          <GlobalSearch
            className="mt-5"
            variant="dashboard"
            ariaLabel="Search BinVault inventory"
            placeholder="What are you looking for?"
          />
        </section>

        <DashboardSummaryCards summary={dashboard.summary} />

        <AttentionCenter attention={dashboard.attention} />

        <RecentActivity events={dashboard.recentActivity} />

        <div className="grid gap-10 xl:grid-cols-2">
          <RecentlyAdded items={dashboard.recentItems} />

          <DashboardInsights insights={dashboard.insights} />
        </div>

        <StorageUtilization locations={dashboard.storage} />
      </div>
    </AppShell>
  );
}
