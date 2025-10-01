
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VisibleColumns } from './BudgetColumnVisibilityDropdown';

interface BudgetTableHeaderProps {
  showVarianceAsPercentage: boolean;
  onToggleVarianceMode: () => void;
  visibleColumns: VisibleColumns;
}

export function BudgetTableHeader({ showVarianceAsPercentage, onToggleVarianceMode, visibleColumns }: BudgetTableHeaderProps) {

  return (
    <TableHeader>
      <TableRow className="h-8">
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-12"></TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-20">Cost Code</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-40">Name</TableHead>
        {visibleColumns.cost && (
          <TableHead className="h-8 px-3 py-0 text-xs font-medium w-32">Cost</TableHead>
        )}
        {visibleColumns.unit && (
          <TableHead className="h-8 px-3 py-0 text-xs font-medium w-20">Unit</TableHead>
        )}
        {visibleColumns.quantity && (
          <TableHead className="h-8 px-3 py-0 text-xs font-medium w-24">Quantity</TableHead>
        )}
        {visibleColumns.totalBudget && (
          <TableHead className="h-8 px-3 py-0 text-xs font-medium w-32">Total Budget</TableHead>
        )}
        {visibleColumns.historicalCosts && (
          <TableHead className="h-8 px-3 py-0 text-xs font-medium w-48">
            <div className="-ml-3">Historical Job Costs</div>
          </TableHead>
        )}
        {visibleColumns.variance && (
          <TableHead className="h-8 px-3 py-0 text-xs font-medium w-32">
            <button
              onClick={onToggleVarianceMode}
              className="text-xs font-medium hover:bg-muted rounded px-1 py-0.5"
            >
              Variance {showVarianceAsPercentage ? '%' : '$'}
            </button>
          </TableHead>
        )}
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-20 sticky right-0 bg-background">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
