import { getDashboardAttention } from "@/lib/services/dashboard/attention";
import { getDashboardInsights } from "@/lib/services/dashboard/insights";
import { getDashboardRecentItems } from "@/lib/services/dashboard/recent-items";
import { getDashboardStorage } from "@/lib/services/dashboard/storage";
import { getDashboardSummary } from "@/lib/services/dashboard/summary";
import type { DashboardData } from "@/lib/types/dashboard";

export class DashboardService {
  async getDashboardData(): Promise<DashboardData> {
    const [summary, attention, recentItems, storage, insights] =
      await Promise.all([
        getDashboardSummary(),
        getDashboardAttention(),
        getDashboardRecentItems(),
        getDashboardStorage(),
        getDashboardInsights(),
      ]);

    return {
      summary,
      attention,
      recentItems,
      storage,
      insights,
      generatedAt: new Date(),
    };
  }
}

export const dashboardService = new DashboardService();