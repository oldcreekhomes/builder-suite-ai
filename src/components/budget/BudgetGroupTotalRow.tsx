import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';

interface BudgetGroupTotalRowProps {
  group: string;
  groupTotal: number;
  historicalTotal?: number;
  showVarianceAsPercentage?: boolean;
}

export function BudgetGroupTotalRow({ 
  group, 
  groupTotal,
  historicalTotal,
  showVarianceAsPercentage = false
}: BudgetGroupTotalRowProps) {
  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const calculateVariance = () => {
    if (historicalTotal === undefined || historicalTotal === null || groupTotal === 0) return null;
    if (showVarianceAsPercentage) {
      return ((historicalTotal - groupTotal) / groupTotal) * 100;
    }
    return historicalTotal - groupTotal;
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
        <div className="text-xs font-medium flex flex-col leading-tight">
          <span>{group.split(' ')[0]}</span>
          <span className="text-[10px]">Total</span>
        </div>
      </TableCell>
      <TableCell className="px-1 py-0 w-40">
        {/* Empty name cell */}
      </TableCell>
      <TableCell className="px-3 py-0 w-32">
        {/* Empty price cell */}
      </TableCell>
      <TableCell className="px-3 py-0 w-20">
        {/* Empty unit cell */}
      </TableCell>
      <TableCell className="px-3 py-0 w-24">
        {/* Empty quantity cell */}
      </TableCell>
      <TableCell className="px-3 py-0 w-32">
        <div className="text-xs font-medium">
          {formatCurrency(groupTotal)}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-48">
        <div className="text-xs -ml-3">
          {historicalTotal !== undefined && historicalTotal !== null && historicalTotal !== 0 
            ? formatCurrency(historicalTotal) 
            : '-'}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-32">
        <div className={`text-xs font-medium ${getVarianceColor(variance)}`}>
          {formatVariance(variance)}
        </div>
      </TableCell>
      <TableCell className="px-1 py-0 w-20">
        {/* Empty actions cell */}
      </TableCell>
    </TableRow>
  );
}
