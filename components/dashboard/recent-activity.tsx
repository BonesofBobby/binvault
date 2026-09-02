import { ActivityList } from "@/components/activity/activity-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardRecentActivityItem } from "@/lib/types/dashboard";

export function RecentActivity({
  events,
}: {
  events: DashboardRecentActivityItem[];
}) {
  return (
    <section aria-labelledby="recent-activity-heading" className="space-y-4">
      <div>
        <h2 id="recent-activity-heading" className="text-lg font-semibold tracking-tight">
          Recent Activity
        </h2>
        <p className="text-sm text-muted-foreground">
          The latest changes recorded across BinVault.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Application History</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityList
            events={events}
            emptyDescription="Create, edit, move, or delete a record to begin the history."
          />
        </CardContent>
      </Card>
    </section>
  );
}
