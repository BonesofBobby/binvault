import {
  Boxes,
  FileText,
  FolderTree,
  ImageIcon,
  MapPin,
  Package,
  Tags,
  Wrench,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardSummary } from "@/lib/types/dashboard";

interface DashboardSummaryCardsProps {
  summary: DashboardSummary;
}

const summaryCards = [
  {
    key: "locationCount",
    label: "Locations",
    icon: MapPin,
  },
  {
    key: "containerCount",
    label: "Containers",
    icon: Boxes,
  },
  {
    key: "inventoryItemCount",
    label: "Inventory Items",
    icon: Package,
  },
  {
    key: "assetCount",
    label: "Assets",
    icon: Wrench,
  },
  {
    key: "consumableCount",
    label: "Consumables",
    icon: FolderTree,
  },
  {
    key: "documentCount",
    label: "Documents",
    icon: FileText,
  },
  {
    key: "mediaCount",
    label: "Media Files",
    icon: ImageIcon,
  },
  {
    key: "categoryCount",
    label: "Categories",
    icon: Tags,
  },
] satisfies Array<{
  key: keyof DashboardSummary;
  label: string;
  icon: typeof MapPin;
}>;

export function DashboardSummaryCards({
  summary,
}: DashboardSummaryCardsProps) {
  return (
    <section
      aria-labelledby="dashboard-summary-heading"
      className="space-y-4"
    >
      <div>
        <h2
          id="dashboard-summary-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Inventory Overview
        </h2>
        <p className="text-sm text-muted-foreground">
          A current summary of your BinVault storage system.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {label}
              </CardTitle>
              <Icon
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
            </CardHeader>

            <CardContent>
              <div className="text-2xl font-bold">
                {summary[key].toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}