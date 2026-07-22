import Link from "next/link";
import {
  Boxes,
  CalendarClock,
  CameraOff,
  Package,
  Tags,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardInsights } from "@/lib/types/dashboard";

interface DashboardInsightsProps {
  insights: DashboardInsights;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function DashboardInsights({
  insights,
}: DashboardInsightsProps) {
  return (
    <section
      aria-labelledby="dashboard-insights-heading"
      className="space-y-4"
    >
      <div>
        <h2
          id="dashboard-insights-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Inventory Insights
        </h2>
        <p className="text-sm text-muted-foreground">
          Useful patterns and highlights from your current inventory.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Most Used Category
            </CardTitle>
            <Tags
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
          </CardHeader>

          <CardContent>
            {insights.mostUsedCategory ? (
              <div className="space-y-1">
                <p className="text-2xl font-bold">
                  {insights.mostUsedCategory.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {insights.mostUsedCategory.inventoryItemCount.toLocaleString()}{" "}
                  inventory{" "}
                  {insights.mostUsedCategory.inventoryItemCount === 1
                    ? "record"
                    : "records"}
                  {" · "}
                  {insights.mostUsedCategory.totalQuantity.toLocaleString()}{" "}
                  total quantity
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No categorized inventory is available yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Largest Container
            </CardTitle>
            <Boxes
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
          </CardHeader>

          <CardContent>
            {insights.largestContainer ? (
              <div className="space-y-1">
                <p className="text-2xl font-bold">
                  {insights.largestContainer.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {insights.largestContainer.binNumber}
                  {" · "}
                  {insights.largestContainer.inventoryItemCount.toLocaleString()}{" "}
                  inventory{" "}
                  {insights.largestContainer.inventoryItemCount === 1
                    ? "record"
                    : "records"}
                  {" · "}
                  {insights.largestContainer.totalQuantity.toLocaleString()}{" "}
                  total quantity
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No containers are available yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Items Without Photos
            </CardTitle>
            <CameraOff
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
          </CardHeader>

          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {insights.itemsWithoutPhotosCount.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                Inventory{" "}
                {insights.itemsWithoutPhotosCount === 1
                  ? "record is"
                  : "records are"}{" "}
                missing media.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Newest Inventory Item
            </CardTitle>
            <Package
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
          </CardHeader>

          <CardContent>
            {insights.newestItem ? (
              <div className="space-y-1">
                <Link
                  href={`/inventory/${insights.newestItem.id}`}
                  className="text-lg font-semibold hover:underline"
                >
                  {insights.newestItem.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {insights.newestItem.containerName}
                  {" · "}
                  {insights.newestItem.containerBinNumber}
                </p>
                <p className="text-xs text-muted-foreground">
                  Added {formatDate(insights.newestItem.createdAt)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No inventory items are available yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Oldest Inventory Item
            </CardTitle>
            <CalendarClock
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
          </CardHeader>

          <CardContent>
            {insights.oldestItem ? (
              <div className="space-y-1">
                <Link
                  href={`/inventory/${insights.oldestItem.id}`}
                  className="text-lg font-semibold hover:underline"
                >
                  {insights.oldestItem.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {insights.oldestItem.containerName}
                  {" · "}
                  {insights.oldestItem.containerBinNumber}
                </p>
                <p className="text-xs text-muted-foreground">
                  Added {formatDate(insights.oldestItem.createdAt)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No inventory items are available yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}