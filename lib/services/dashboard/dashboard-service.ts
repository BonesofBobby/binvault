import { getDashboardAttention } from "@/lib/services/dashboard/attention";
import { getDashboardInsights } from "@/lib/services/dashboard/insights";
import { getDashboardRecentItems } from "@/lib/services/dashboard/recent-items";
import { getDashboardRecentActivity } from "@/lib/services/dashboard/recent-activity";
import { getDashboardStorage } from "@/lib/services/dashboard/storage";
import { getDashboardSummary } from "@/lib/services/dashboard/summary";
import type { DashboardData } from "@/lib/types/dashboard";

export class DashboardService {
  async getDashboardData(): Promise<DashboardData> {
    const [summary, attention, recentItems, recentActivity, storage, insights] =
      await Promise.all([
        getDashboardSummary(),
        getDashboardAttention(),
        getDashboardRecentItems(),
        getDashboardRecentActivity(),
        getDashboardStorage(),
        getDashboardInsights(),
      ]);

    return {
      summary,
      attention,
      recentItems,
      recentActivity,
      storage,
      insights,
      generatedAt: new Date(),
    };
  }
}

export const dashboardService = new DashboardService();
