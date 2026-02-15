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
    <TableRow className="bg-primary/10 font-bold">
      <TableCell colSpan={2}>
        Total Project
      </TableCell>
      <TableCell className="text-right">
        {formatCurrency(totalBudget)}
      </TableCell>
      <TableCell className="text-right">
        {formatCurrency(totalActual)}
      </TableCell>
      <TableCell className={`text-right ${getVarianceColor(totalVariance)}`}>
        {formatCurrency(totalVariance)}
      </TableCell>
    </TableRow>
  );
}
