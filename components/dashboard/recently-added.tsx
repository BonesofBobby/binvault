import Image from "next/image";
import Link from "next/link";
import { ImageOff, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardRecentItem } from "@/lib/types/dashboard";

interface RecentlyAddedProps {
  items: DashboardRecentItem[];
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatInventoryType(
  inventoryType: DashboardRecentItem["inventoryType"],
): string {
  switch (inventoryType) {
    case "STANDARD_ITEM":
      return "Standard Item";
    case "ASSET":
      return "Asset";
    case "CONSUMABLE":
      return "Consumable";
    case "DOCUMENT":
      return "Document";
  }
}

export function RecentlyAdded({
  items,
}: RecentlyAddedProps) {
  return (
    <section
      aria-labelledby="recently-added-heading"
      className="space-y-4"
    >
      <div>
        <h2
          id="recently-added-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Recently Added
        </h2>
        <p className="text-sm text-muted-foreground">
          The newest inventory records added to BinVault.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Latest Inventory
          </CardTitle>

          <Link
            href="/inventory"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>

        <CardContent>
          {items.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center">
              <Package
                aria-hidden="true"
                className="size-8 text-muted-foreground"
              />
              <div>
                <p className="font-medium">
                  No inventory items yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Newly added inventory will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                >
                  <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                    {item.primaryPhotoUrl ? (
                      <Image
                        src={item.primaryPhotoUrl}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <ImageOff
                        aria-hidden="true"
                        className="size-6 text-muted-foreground"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="truncate font-medium hover:underline"
                      >
                        {item.name}
                      </Link>

                      <Badge variant="secondary">
                        {formatInventoryType(item.inventoryType)}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>
                        {item.containerName} · {item.containerBinNumber}
                      </span>

                      <span>
                        Quantity: {item.quantity.toLocaleString()}
                      </span>

                      {item.categoryName ? (
                        <span>{item.categoryName}</span>
                      ) : null}
                    </div>
                  </div>

                  <time
                    dateTime={item.createdAt.toISOString()}
                    className="shrink-0 text-sm text-muted-foreground"
                  >
                    {formatDate(item.createdAt)}
                  </time>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}