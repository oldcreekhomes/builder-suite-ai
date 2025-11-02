import { TableRow, TableCell } from "@/components/ui/table";

interface JobCostGroupTotalRowProps {
  group: string;
  totals: {
    budget: number;
    actual: number;
    variance: number;
  };
}

export function JobCostGroupTotalRow({ group, totals }: JobCostGroupTotalRowProps) {
  const formatCurrency = (amount: number) => {
    const normalized = Math.abs(amount) < 0.005 ? 0 : amount;
    const value = Object.is(normalized, -0) ? 0 : normalized;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return "text-green-600";
    if (variance < 0) return "text-red-600";
    return "";
  };

  return (
    <TableRow className="h-10 bg-muted/30 font-semibold">
      <TableCell colSpan={2} className="py-2 text-sm">
        Subtotal - {group}
      </TableCell>
      <TableCell className="text-right py-2 text-sm">
        {formatCurrency(totals.budget)}
      </TableCell>
      <TableCell className="text-right py-2 text-sm">
        {formatCurrency(totals.actual)}
      </TableCell>
      <TableCell className={`text-right py-2 text-sm ${getVarianceColor(totals.variance)}`}>
        {formatCurrency(totals.variance)}
      </TableCell>
    </TableRow>
  );
}
