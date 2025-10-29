import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { VisibleColumns } from './BudgetColumnVisibilityDropdown';

interface BudgetProjectTotalRowProps {
  totalBudget: number;
  totalHistorical: number;
  showVarianceAsPercentage?: boolean;
  visibleColumns: VisibleColumns;
}

export function BudgetProjectTotalRow({ 
  totalBudget, 
  totalHistorical,
  showVarianceAsPercentage = false,
  visibleColumns
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
    <TableRow className="font-bold bg-primary/10 h-10 border-t-4 border-primary">
      <TableCell colSpan={3} className="py-1 text-sm">Total Project Budget</TableCell>
      <TableCell className="w-48 py-1"></TableCell>
      <TableCell className="w-52 py-1 text-sm">
        {formatCurrency(totalBudget)}
      </TableCell>
      <TableCell className="w-10 py-1"></TableCell>
      {visibleColumns.historicalCosts && (
        <TableCell className="w-52 py-1 text-sm">
          {totalHistorical > 0 ? formatCurrency(totalHistorical) : '-'}
        </TableCell>
      )}
      {visibleColumns.variance && (
        <TableCell className="w-48 py-1 text-sm">
          {totalHistorical > 0 ? (
            <span className={getVarianceColor(variance)}>
              {formatVariance(variance)}
            </span>
          ) : (
            '-'
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
