import { TableRow, TableCell } from "@/components/ui/table";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JobCostGroupHeaderProps {
  group: string;
  isExpanded: boolean;
  onToggle: () => void;
  groupTotal: {
    budget: number;
    actual: number;
    variance: number;
  };
  stickyOffset: number;
}

export function JobCostGroupHeader({
  group,
  isExpanded,
  onToggle,
  groupTotal,
  stickyOffset,
}: JobCostGroupHeaderProps) {
  const formatCurrency = (amount: number) => {
    const normalized = Math.abs(amount) < 0.005 ? 0 : amount;
    const value = Object.is(normalized, -0) ? 0 : normalized;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <TableRow 
      className="bg-background h-12 hover:bg-background border-0 shadow-none" 
      style={{ position: 'sticky', top: stickyOffset, zIndex: 15, borderBottom: '0', boxShadow: 'none' }}
    >
      <TableCell colSpan={2} className="font-semibold py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <span>{group}</span>
        </div>
      </TableCell>
      <TableCell className="text-right py-2 text-sm text-muted-foreground">
        {formatCurrency(groupTotal.budget)}
      </TableCell>
      <TableCell className="text-right py-2 text-sm text-muted-foreground">
        {formatCurrency(groupTotal.actual)}
      </TableCell>
      <TableCell className="text-right py-2 text-sm text-muted-foreground">
        {formatCurrency(groupTotal.variance)}
      </TableCell>
    </TableRow>
  );
}
