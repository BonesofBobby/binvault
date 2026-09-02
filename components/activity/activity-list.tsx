import { Activity } from "lucide-react";

export type ActivityListItem = {
  id: number;
  eventType: string;
  summary: string;
  createdAt: Date;
};

type ActivityListProps = {
  events: ActivityListItem[];
  emptyTitle?: string;
  emptyDescription?: string;
};

function formatEventType(eventType: string) {
  return eventType
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function ActivityList({
  events,
  emptyTitle = "No activity yet",
  emptyDescription = "Recorded changes will appear here.",
}: ActivityListProps) {
  if (events.length === 0) {
    return (
      <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center">
        <Activity aria-hidden="true" className="size-7 text-muted-foreground" />
        <div>
          <p className="font-medium">{emptyTitle}</p>
          <p className="text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <ol className="divide-y" aria-label="Activity history">
      {events.map((event) => (
        <li key={event.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">{event.summary}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatEventType(event.eventType)}
            </p>
          </div>
          <time
            dateTime={event.createdAt.toISOString()}
            className="shrink-0 text-xs text-muted-foreground"
          >
            {formatTimestamp(event.createdAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}
