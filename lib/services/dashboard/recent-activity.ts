import { listRecentEvents } from "@/lib/services/event-service";
import type { DashboardRecentActivityItem } from "@/lib/types/dashboard";

export const DASHBOARD_RECENT_ACTIVITY_LIMIT = 8;

export async function getDashboardRecentActivity(
  limit = DASHBOARD_RECENT_ACTIVITY_LIMIT,
): Promise<DashboardRecentActivityItem[]> {
  const events = await listRecentEvents(limit);
  return events.map((event) => ({
    id: event.id,
    eventType: event.eventType,
    entityType: event.entityType,
    entityId: event.entityId,
    summary: event.summary,
    createdAt: event.createdAt,
  }));
}
