import { TableRow, TableCell } from '@/components/ui/table';
import { VisibleColumns } from './BudgetColumnVisibilityDropdown';
import { calculateBudgetItemTotal } from '@/utils/budgetUtils';

interface BudgetProjectTotalRowProps {
  totalBudget: number;
  totalHistorical: number;
  showVarianceAsPercentage?: boolean;
  visibleColumns: VisibleColumns;
  budgetItems?: any[];
  groupedBudgetItems?: Record<string, any[]>;
  subcategoryTotals?: Record<string, number>;
}

export function BudgetProjectTotalRow({ 
  totalBudget, 
  totalHistorical,
  showVarianceAsPercentage = false,
  visibleColumns,
  budgetItems,
  groupedBudgetItems
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
    <TableRow className="bg-muted/50 font-bold border-t-2 border-primary/30">
      <TableCell colSpan={3} className="text-right py-3 px-3">
        <span className="text-base font-bold">Project Total:</span>
      </TableCell>
      <TableCell className="text-right py-3 px-3 text-base font-bold bg-muted/50 w-48">
        ${totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      {visibleColumns.historicalCosts && (
        <TableCell className="text-right py-3 px-3 text-base bg-muted/50 w-48">
          {totalHistorical !== null && totalHistorical !== undefined 
            ? `$${totalHistorical.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '-'
          }
        </TableCell>
      )}
      {visibleColumns.variance && (
        <TableCell className="text-right py-3 px-3 text-base font-bold bg-muted/50 w-40">
          {variance !== null ? (
            <span className={getVarianceColor(variance)}>
              {formatVariance(variance)}
            </span>
          ) : '-'}
        </TableCell>
      )}
      <TableCell className="sticky right-0 bg-muted/50 z-20 py-3 px-3 w-40" />
    </TableRow>
  );
}
