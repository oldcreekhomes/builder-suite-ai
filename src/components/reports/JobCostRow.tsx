import { TableRow, TableCell } from "@/components/ui/table";

interface JobCostRowData {
  costCodeId: string;
  costCode: string;
  costCodeName: string;
  parentGroup: string;
  budget: number;
  actual: number;
  variance: number;
}

interface JobCostRowProps {
  row: JobCostRowData;
  onBudgetClick: () => void;
  onActualClick: () => void;
}

export function JobCostRow({ row, onBudgetClick, onActualClick }: JobCostRowProps) {
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
    <TableRow className="h-10 hover:bg-muted/50 transition-colors">
      <TableCell className="py-1 text-sm font-medium">
        {row.costCode}
      </TableCell>
      <TableCell className="py-1 text-sm">
        {row.costCodeName}
      </TableCell>
      <TableCell 
        className="text-right py-1 text-sm cursor-pointer hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          onBudgetClick();
        }}
      >
        {formatCurrency(row.budget)}
      </TableCell>
      <TableCell 
        className="text-right py-1 text-sm cursor-pointer hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          onActualClick();
        }}
      >
        {formatCurrency(row.actual)}
      </TableCell>
      <TableCell className={`text-right py-1 text-sm font-medium ${getVarianceColor(row.variance)}`}>
        {formatCurrency(row.variance)}
      </TableCell>
    </TableRow>
  );
}
