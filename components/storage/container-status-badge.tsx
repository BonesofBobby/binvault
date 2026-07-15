import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ContainerStatus = "EMPTY" | "PARTIAL" | "COMPLETE";

type ContainerStatusBadgeProps = {
  status: ContainerStatus;
};

const statusStyles: Record<ContainerStatus, string> = {
  COMPLETE:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  PARTIAL:
    "border-amber-500/30 bg-amber-500/10 text-amber-300",
  EMPTY:
    "border-red-500/30 bg-red-500/10 text-red-300",
};

const statusLabels: Record<ContainerStatus, string> = {
  COMPLETE: "Complete",
  PARTIAL: "Partial",
  EMPTY: "Empty",
};

export function ContainerStatusBadge({
  status,
}: ContainerStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-3 py-1", statusStyles[status])}
    >
      {statusLabels[status]}
    </Badge>
  );
}