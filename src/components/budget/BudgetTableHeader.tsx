
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface BudgetTableHeaderProps {
  showVarianceAsPercentage: boolean;
  onToggleVarianceMode: () => void;
}

export function BudgetTableHeader({ showVarianceAsPercentage, onToggleVarianceMode }: BudgetTableHeaderProps) {

  return (
    <TableHeader>
      <TableRow className="h-8">
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-12"></TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-20">Cost Code</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-40">Name</TableHead>
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-32">Cost</TableHead>
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-20">Unit</TableHead>
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-24">Quantity</TableHead>
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-32">Total Budget</TableHead>
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-48">Historical Job Costs</TableHead>
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-32">
          <button
            onClick={onToggleVarianceMode}
            className="text-xs font-medium hover:bg-muted rounded px-1 py-0.5"
          >
            Variance {showVarianceAsPercentage ? '%' : '$'}
          </button>
        </TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-20">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
