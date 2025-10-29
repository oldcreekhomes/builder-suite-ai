import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { VisibleColumns } from './BudgetColumnVisibilityDropdown';

interface BudgetGroupTotalRowProps {
  group: string;
  groupTotal: number;
  historicalTotal?: number;
  showVarianceAsPercentage?: boolean;
  visibleColumns: VisibleColumns;
}

export function BudgetGroupTotalRow({ 
  group, 
  groupTotal,
  historicalTotal,
  showVarianceAsPercentage = false,
  visibleColumns
}: BudgetGroupTotalRowProps) {
  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const calculateVariance = () => {
    // Only show no variance if BOTH are 0 or null
    if ((historicalTotal === undefined || historicalTotal === null || historicalTotal === 0) && groupTotal === 0) return null;
    
    // Treat null/undefined historical as 0 for calculation
    const historical = historicalTotal || 0;
    
    if (showVarianceAsPercentage && groupTotal !== 0) {
      return ((historical - groupTotal) / groupTotal) * 100;
    }
    return historical - groupTotal;
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
    <TableRow className="font-semibold bg-gray-100 h-10 border-t-2">
      <TableCell colSpan={3} className="py-1 text-sm">Subtotal for {group}</TableCell>
      <TableCell className="w-48 py-1"></TableCell>
      <TableCell className="w-52 py-1 text-sm">
        {formatCurrency(groupTotal)}
      </TableCell>
      <TableCell className="w-16 px-0 py-1"></TableCell>
      {visibleColumns.historicalCosts && (
        <TableCell className="w-52 py-1 text-sm">
          {historicalTotal > 0 ? formatCurrency(historicalTotal) : '-'}
        </TableCell>
      )}
      {visibleColumns.variance && (
        <TableCell className="w-48 py-1 text-sm">
          {historicalTotal > 0 ? (
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
