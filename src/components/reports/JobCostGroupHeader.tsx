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
  
}

export function JobCostGroupHeader({
  group,
  isExpanded,
  onToggle,
  groupTotal,
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
      className="bg-muted/40 hover:bg-muted/60 border-b"
    >
      <TableCell 
        colSpan={2} 
        className="py-3 px-3 font-semibold"
      >
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
      <TableCell 
        className="text-right py-3 px-3 text-sm text-muted-foreground"
      >
        {formatCurrency(groupTotal.budget)}
      </TableCell>
      <TableCell 
        className="text-right py-3 px-3 text-sm text-muted-foreground"
      >
        {formatCurrency(groupTotal.actual)}
      </TableCell>
      <TableCell 
        className="text-right py-3 px-3 text-sm text-muted-foreground"
      >
        {formatCurrency(groupTotal.variance)}
      </TableCell>
    </TableRow>
  );
}
