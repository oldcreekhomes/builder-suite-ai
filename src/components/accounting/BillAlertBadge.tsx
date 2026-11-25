import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type BillAlertType = "review" | "approved" | "rejected" | "late" | "neutral";

// Single source of style for every bill count (Manage Bills, PM, Project, Accounting dashboards).
const GREEN = "bg-green-100 text-green-700 hover:bg-green-100";

/**
 * Review/Approved with `overdue` render a split pill: left = on time (green), right = overdue (red).
 * Left + right always equals the stage's total, so nothing is counted twice.
 */
export function BillAlertBadge({
  type,
  count,
  overdue,
  onClick,
  onOverdueClick,
  className,
}: {
  type: BillAlertType;
  count: number;
  overdue?: number;
  onClick?: (e: React.MouseEvent) => void;
  onOverdueClick?: (e: React.MouseEvent) => void;
  className?: string;
}) {
  const green = type === "review" || type === "approved";
  if (type === "neutral") {
    return <Badge variant="secondary" className={cn(onClick && "cursor-pointer hover:opacity-80", className)} onClick={onClick}>{count}</Badge>;
  }
  const late = green ? Math.min(overdue || 0, count) : 0;
  if (late > 0) {
    const onTime = count - late;
    return (
      <span className={cn("inline-flex overflow-hidden rounded-full text-xs font-semibold", className)} title={`${onTime} on time, ${late} overdue`}>
        <span className={cn("px-2 py-0.5", GREEN, onClick && "cursor-pointer hover:opacity-80")} onClick={onClick}>{onTime}</span>
        <span className={cn("px-2 py-0.5 bg-destructive text-destructive-foreground", (onOverdueClick || onClick) && "cursor-pointer hover:opacity-80")} onClick={onOverdueClick || onClick}>{late}</span>
      </span>
    );
  }
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
