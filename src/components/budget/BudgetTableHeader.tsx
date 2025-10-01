
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
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-32">
          <span className={visibleColumns.cost ? '' : 'opacity-0'}>Cost</span>
        </TableHead>
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-20">
          <span className={visibleColumns.unit ? '' : 'opacity-0'}>Unit</span>
        </TableHead>
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-24">
          <span className={visibleColumns.quantity ? '' : 'opacity-0'}>Quantity</span>
        </TableHead>
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-32">
          <span className={visibleColumns.totalBudget ? '' : 'opacity-0'}>Total Budget</span>
        </TableHead>
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-48">
          <div className={`-ml-3 ${visibleColumns.historicalCosts ? '' : 'opacity-0'}`}>Historical Job Costs</div>
        </TableHead>
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-32">
          <button
            onClick={onToggleVarianceMode}
            className={`text-xs font-medium rounded px-1 py-0.5 ${visibleColumns.variance ? 'hover:bg-muted' : 'opacity-0 pointer-events-none'}`}
          >
            Historical Variance {showVarianceAsPercentage ? '%' : '$'}
          </button>
        </TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-20 sticky right-0 bg-background z-30 text-center">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
