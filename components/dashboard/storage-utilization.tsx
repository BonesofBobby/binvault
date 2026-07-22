import { Boxes, MapPin, Package } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardStorageLocation } from "@/lib/types/dashboard";

interface StorageUtilizationProps {
  locations: DashboardStorageLocation[];
}

function formatLocationName(
  location: DashboardStorageLocation,
): string {
  return location.parentName
    ? `${location.parentName} / ${location.name}`
    : location.name;
}

export function StorageUtilization({
  locations,
}: StorageUtilizationProps) {
  const totalContainers = locations.reduce(
    (total, location) => total + location.containerCount,
    0,
  );

  const totalInventoryItems = locations.reduce(
    (total, location) => total + location.inventoryItemCount,
    0,
  );

  const totalQuantity = locations.reduce(
    (total, location) => total + location.totalQuantity,
    0,
  );

  return (
    <section
      aria-labelledby="storage-utilization-heading"
      className="space-y-4"
    >
      <div>
        <h2
          id="storage-utilization-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Storage Utilization
        </h2>
        <p className="text-sm text-muted-foreground">
          Inventory distribution across your storage locations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Location Breakdown
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin
                  aria-hidden="true"
                  className="size-4"
                />
                Locations
              </div>
              <p className="mt-2 text-2xl font-bold">
                {locations.length.toLocaleString()}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Boxes
                  aria-hidden="true"
                  className="size-4"
                />
                Containers
              </div>
              <p className="mt-2 text-2xl font-bold">
                {totalContainers.toLocaleString()}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package
                  aria-hidden="true"
                  className="size-4"
                />
                Total Quantity
              </div>
              <p className="mt-2 text-2xl font-bold">
                {totalQuantity.toLocaleString()}
              </p>
            </div>
          </div>

          {locations.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center">
              <MapPin
                aria-hidden="true"
                className="size-8 text-muted-foreground"
              />
              <div>
                <p className="font-medium">
                  No storage locations yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Location statistics will appear after locations and
                  containers are created.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {locations.map((location) => {
                const itemShare =
                  totalInventoryItems > 0
                    ? Math.round(
                        (location.inventoryItemCount /
                          totalInventoryItems) *
                          100,
                      )
                    : 0;

                return (
                  <article
                    key={location.id}
                    className="space-y-3 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-medium">
                          {formatLocationName(location)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {location.containerCount.toLocaleString()}{" "}
                          {location.containerCount === 1
                            ? "container"
                            : "containers"}
                          {" · "}
                          {location.inventoryItemCount.toLocaleString()}{" "}
                          {location.inventoryItemCount === 1
                            ? "inventory record"
                            : "inventory records"}
                        </p>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        {location.totalQuantity.toLocaleString()} total
                        quantity
                      </div>
                    </div>

                    <div
                      className="h-2 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-label={`${formatLocationName(
                        location,
                      )} inventory share`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={itemShare}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${itemShare}%`,
                        }}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {itemShare}% of all inventory records
                    </p>
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