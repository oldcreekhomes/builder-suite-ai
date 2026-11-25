import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type BillAlertType = "review" | "approved" | "rejected" | "late" | "neutral";

// Single source of style for every bill count (Manage Bills, PM, Project, Accounting dashboards).
const GREEN = "bg-green-100 text-green-700 hover:bg-green-100";

/**
 * Zero totals show a dash; Review/Approved split only when both counts are nonzero.
 * On-time-only is green and overdue-only is red, without a zero segment.
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
  if (count === 0) {
    return <span className={cn("text-muted-foreground", className)} aria-label="No bills">—</span>;
  }
  if (type === "neutral") {
    return <Badge variant="secondary" className={cn(onClick && "cursor-pointer hover:opacity-80", className)} onClick={onClick}>{count}</Badge>;
  }
  const late = green ? Math.min(overdue || 0, count) : 0;
  if (late > 0 && late < count) {
    const onTime = count - late;
    return (
      <span className={cn("inline-flex overflow-hidden rounded-full text-xs font-semibold", className)} title={`${onTime} on time, ${late} overdue`}>
        <span className={cn("px-2 py-0.5", GREEN, onClick && "cursor-pointer hover:opacity-80")} onClick={onClick}>{onTime}</span>
        <span className={cn("px-2 py-0.5 bg-destructive text-destructive-foreground", (onOverdueClick || onClick) && "cursor-pointer hover:opacity-80")} onClick={onOverdueClick || onClick}>{late}</span>
      </span>
    );
  }
  const overdueOnly = green && late === count;
  const handleClick = overdueOnly ? onOverdueClick || onClick : onClick;
  return (
    <Badge
      variant={green && !overdueOnly ? "secondary" : "destructive"}
      className={cn(green && !overdueOnly && GREEN, handleClick && "cursor-pointer hover:opacity-80", className)}
      title={green ? `${count} ${overdueOnly ? "overdue" : "on time"}` : undefined}
      onClick={handleClick}
    >
      {count}
    </Badge>
  );
}
