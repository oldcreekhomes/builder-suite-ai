import { TableRow, TableCell } from "@/components/ui/table";

interface JobCostProjectTotalRowProps {
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
}

export function JobCostProjectTotalRow({
  totalBudget,
  totalActual,
  totalVariance,
}: JobCostProjectTotalRowProps) {
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
    <TableRow className="h-12 bg-primary/10 font-bold text-base">
      <TableCell colSpan={2} className="py-3">
        Total Project
      </TableCell>
      <TableCell className="text-right py-3">
        {formatCurrency(totalBudget)}
      </TableCell>
      <TableCell className="text-right py-3">
        {formatCurrency(totalActual)}
      </TableCell>
      <TableCell className={`text-right py-3 ${getVarianceColor(totalVariance)}`}>
        {formatCurrency(totalVariance)}
      </TableCell>
    </TableRow>
  );
}
