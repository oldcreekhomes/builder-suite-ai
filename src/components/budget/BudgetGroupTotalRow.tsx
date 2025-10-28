import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { VisibleColumns } from './BudgetColumnVisibilityDropdown';
import { calculateBudgetItemTotal } from '@/utils/budgetUtils';

interface BudgetGroupTotalRowProps {
  group: string;
  groupTotal: number;
  historicalTotal?: number;
  showVarianceAsPercentage?: boolean;
  visibleColumns: VisibleColumns;
  groupItems?: any[];
  subcategoryTotals?: Record<string, number>;
}

export function BudgetGroupTotalRow({ 
  group, 
  groupTotal,
  historicalTotal,
  showVarianceAsPercentage = false,
  visibleColumns,
  groupItems = [],
  subcategoryTotals = {}
}: BudgetGroupTotalRowProps) {
  // Calculate actual displayed total using same logic as rows
  const displayedTotal = React.useMemo(() => {
    return groupItems.reduce((sum, item) => {
      const subcategoryTotal = subcategoryTotals[item.id];
      return sum + calculateBudgetItemTotal(item, subcategoryTotal, false);
    }, 0);
  }, [groupItems, subcategoryTotals]);
  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const calculateVariance = () => {
    // Use displayedTotal instead of groupTotal
    // Only show no variance if BOTH are 0 or null
    if ((historicalTotal === undefined || historicalTotal === null || historicalTotal === 0) && displayedTotal === 0) return null;
    
    // Treat null/undefined historical as 0 for calculation
    const historical = historicalTotal || 0;
    
    if (showVarianceAsPercentage && displayedTotal !== 0) {
      return ((historical - displayedTotal) / displayedTotal) * 100;
    }
    return historical - displayedTotal;
  };

  const variance = calculateVariance();

  const getVarianceColor = (variance: number | null) => {
    if (variance === null) return 'text-gray-400';
    if (variance > 0) return 'text-green-600'; // Budget under historical (good)
    if (variance < 0) return 'text-red-600'; // Budget over historical (warning)
    return 'text-gray-600'; // On budget
  };

  const formatVariance = (variance: number | null) => {
    if (variance === null) return '-';
    if (showVarianceAsPercentage) {
      return `${variance > 0 ? '+' : ''}${variance.toFixed(1)}%`;
    }
    return `${variance > 0 ? '+' : '-'}${formatCurrency(Math.abs(variance))}`;
  };

  return (
    <TableRow className="bg-muted/20 font-semibold border-t">
      <TableCell colSpan={3 + (visibleColumns.cost ? 1 : 0) + (visibleColumns.unit ? 1 : 0) + (visibleColumns.quantity ? 1 : 0)} className="text-right py-2 px-3">
        <span className="text-sm font-semibold">{group} Subtotal:</span>
      </TableCell>
      <TableCell className="text-right py-2 px-3 text-sm font-semibold bg-muted/20">
        ${displayedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      {visibleColumns.historicalCosts && (
        <TableCell className="text-right py-2 px-3 text-sm bg-muted/20">
          {historicalTotal !== null && historicalTotal !== undefined 
            ? `$${historicalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '-'
          }
        </TableCell>
      )}
      {visibleColumns.variance && (
        <TableCell className="text-right py-2 px-3 text-sm font-medium bg-muted/20">
          {variance !== null ? (
            <span className={getVarianceColor(variance)}>
              {formatVariance(variance)}
            </span>
          ) : '-'}
        </TableCell>
      )}
      <TableCell className="sticky right-0 bg-muted/20 z-20 py-2 px-3" />
    </TableRow>
  );
}
