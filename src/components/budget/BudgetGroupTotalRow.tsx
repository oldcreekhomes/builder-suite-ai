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
    <TableRow className="bg-white h-8 border-b border-gray-200">
      <TableCell className="px-1 py-0 w-12">
        {/* Empty checkbox cell */}
      </TableCell>
      <TableCell className="px-1 py-0 w-20" style={{ paddingLeft: '50px' }}>
        {/* Empty code cell */}
      </TableCell>
      <TableCell className="px-1 py-0 w-40">
        <div className="text-xs">
          Total Budget
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-32">
        {/* keep width, hide content when column off */}
        <div className={visibleColumns.cost ? '' : 'opacity-0 select-none'}>
          {/* Empty price cell */}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-20">
        <div className={visibleColumns.unit ? '' : 'opacity-0 select-none'}>
          {/* Empty unit cell */}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-24">
        <div className={visibleColumns.quantity ? '' : 'opacity-0 select-none'}>
          {/* Empty quantity cell */}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-32">
        <div className={`text-xs font-medium ${visibleColumns.totalBudget ? '' : 'opacity-0 select-none'}`}>
          {formatCurrency(groupTotal)}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-48">
        <div className={`text-xs -ml-3 ${visibleColumns.historicalCosts ? '' : 'opacity-0 select-none pointer-events-none'}`}>
          {historicalTotal !== undefined && historicalTotal !== null && historicalTotal !== 0 
            ? formatCurrency(historicalTotal) 
            : '-'}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-32">
        <div className={`text-xs font-medium ${getVarianceColor(variance)} ${visibleColumns.variance ? '' : 'opacity-0 select-none'}`}>
          {formatVariance(variance)}
        </div>
      </TableCell>
      <TableCell className="px-1 py-0 w-20 sticky right-0 bg-white z-20">
        {/* Empty actions cell */}
      </TableCell>
    </TableRow>
  );
}
