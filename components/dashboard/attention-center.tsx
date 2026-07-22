import Link from "next/link";
import {
  AlertTriangle,
  CircleAlert,
  Info,
  PackageMinus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  DashboardAttention,
  DashboardAttentionItem,
} from "@/lib/types/dashboard";

interface AttentionCenterProps {
  attention: DashboardAttention;
}

function formatDate(date: Date | null): string | null {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getSeverityDetails(
  item: DashboardAttentionItem,
): {
  label: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  icon: typeof AlertTriangle;
} {
  switch (item.severity) {
    case "critical":
      return {
        label: "Critical",
        badgeVariant: "destructive",
        icon: CircleAlert,
      };

    case "warning":
      return {
        label: "Warning",
        badgeVariant: "secondary",
        icon: AlertTriangle,
      };

    case "information":
      return {
        label: "Information",
        badgeVariant: "outline",
        icon: Info,
      };
  }
}

function getAttentionDetail(item: DashboardAttentionItem): string | null {
  if (
    item.type === "low-consumable" &&
    item.currentQuantity !== null &&
    item.minimumQuantity !== null
  ) {
    return `Current quantity: ${item.currentQuantity.toLocaleString()} · Minimum: ${item.minimumQuantity.toLocaleString()}`;
  }

  const formattedDate = formatDate(item.dueDate);

  if (item.type === "expiring-document" && formattedDate) {
    return `Expiration date: ${formattedDate}`;
  }

  if (item.type === "expiring-warranty" && formattedDate) {
    return `Warranty end date: ${formattedDate}`;
  }

  return null;
}

export function AttentionCenter({
  attention,
}: AttentionCenterProps) {
  return (
    <section
      aria-labelledby="attention-center-heading"
      className="space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="attention-center-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Attention Center
          </h2>
          <p className="text-sm text-muted-foreground">
            Items that may require review or action.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="destructive">
            {attention.criticalCount.toLocaleString()} Critical
          </Badge>
          <Badge variant="secondary">
            {attention.warningCount.toLocaleString()} Warning
          </Badge>
          <Badge variant="outline">
            {attention.informationCount.toLocaleString()} Information
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Current Alerts
          </CardTitle>
        </CardHeader>

        <CardContent>
          {attention.items.length === 0 ? (
            <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center">
              <PackageMinus
                aria-hidden="true"
                className="size-8 text-muted-foreground"
              />
              <div>
                <p className="font-medium">
                  No items need attention
                </p>
                <p className="text-sm text-muted-foreground">
                  BinVault has not detected any current inventory alerts.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {attention.items.map((item) => {
                const severity = getSeverityDetails(item);
                const Icon = severity.icon;
                const detail = getAttentionDetail(item);

                return (
                  <article
                    key={item.id}
                    className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-muted">
                      <Icon
                        aria-hidden="true"
                        className="size-5"
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/inventory/${item.inventoryItemId}`}
                          className="font-medium hover:underline"
                        >
                          {item.inventoryItemName}
                        </Link>

                        <Badge variant={severity.badgeVariant}>
                          {severity.label}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>

                      {detail ? (
                        <p className="text-xs text-muted-foreground">
                          {detail}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}