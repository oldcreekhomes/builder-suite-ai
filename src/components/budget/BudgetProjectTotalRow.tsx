import { TableRow, TableCell } from '@/components/ui/table';

interface BudgetProjectTotalRowProps {
  totalBudget: number;
  totalHistorical: number;
  showVarianceAsPercentage?: boolean;
}

export function BudgetProjectTotalRow({ 
  totalBudget, 
  totalHistorical,
  showVarianceAsPercentage = false 
}: BudgetProjectTotalRowProps) {
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateVariance = () => {
    // Only show no variance if BOTH are 0 or null
    if ((totalHistorical === undefined || totalHistorical === null || totalHistorical === 0) && totalBudget === 0) return null;
    
    // Treat null/undefined historical as 0 for calculation
    const historical = totalHistorical || 0;
    
    if (showVarianceAsPercentage && totalBudget !== 0) {
      return ((historical - totalBudget) / totalBudget) * 100;
    }
    return historical - totalBudget;
  };

  const variance = calculateVariance();

  const getVarianceColor = (variance: number | null) => {
    if (variance === null) return '';
    if (variance > 0) return 'text-red-600';
    if (variance < 0) return 'text-green-600';
    return '';
  };

  const formatVariance = (variance: number | null) => {
    if (variance === null) return '-';
    const prefix = variance > 0 ? '+' : '';
    if (showVarianceAsPercentage) {
      return `${prefix}${variance.toFixed(1)}%`;
    }
    return prefix + formatCurrency(variance);
  };

  return (
    <TableRow className="bg-primary/10 border-t-2 border-primary">
      <TableCell colSpan={8} className="font-bold text-right">
        Total Project Costs
      </TableCell>
      <TableCell className="font-bold text-right">
        {formatCurrency(totalBudget)}
      </TableCell>
      <TableCell className="font-bold text-right">
        {formatCurrency(totalHistorical)}
      </TableCell>
      <TableCell className={`font-bold text-right ${getVarianceColor(variance)}`}>
        {formatVariance(variance)}
      </TableCell>
    </TableRow>
  );
}
