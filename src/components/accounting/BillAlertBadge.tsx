import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type BillAlertType = "review" | "approved" | "rejected" | "late";

// Single source of style for every Accounting Alerts count (PM, Project, Accounting dashboards).
const GREEN = "bg-green-100 text-green-700 hover:bg-green-100";

export function BillAlertBadge({
  type,
  count,
  onClick,
  className,
}: {
  type: BillAlertType;
  count: number;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}) {
  const green = type === "review" || type === "approved";
  return (
    <Badge
      variant={green ? "secondary" : "destructive"}
      className={cn(green && GREEN, onClick && "cursor-pointer hover:opacity-80", className)}
      onClick={onClick}
    >
      {count}
    </Badge>
  );
}
