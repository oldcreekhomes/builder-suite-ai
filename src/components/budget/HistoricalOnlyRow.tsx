import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { Tables } from '@/integrations/supabase/types';
import { VisibleColumns } from './BudgetColumnVisibilityDropdown';

type CostCode = Tables<'cost_codes'>;

interface HistoricalOnlyRowProps {
  costCode: CostCode;
  historicalAmount: number;
  showVarianceAsPercentage?: boolean;
  visibleColumns: VisibleColumns;
}

export function HistoricalOnlyRow({ 
  costCode,
  historicalAmount,
  showVarianceAsPercentage = false,
  visibleColumns,
}: HistoricalOnlyRowProps) {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  // Variance is always negative (we have $0 budget but historical cost exists)
  const variance = showVarianceAsPercentage ? -100 : -historicalAmount;
  
  const formatVariance = (variance: number) => {
    if (showVarianceAsPercentage) {
      return `${variance.toFixed(1)}%`;
    }
    return `-${formatCurrency(Math.abs(variance))}`;
  };

  return (
    <TableRow className="hover:bg-muted/50 border-b">
      <TableCell className="w-8 px-1">
        <Checkbox disabled checked={false} />
      </TableCell>
      <TableCell className="w-28 font-medium pl-4 px-1">
        {costCode.code}
      </TableCell>
      <TableCell className="w-[240px] px-1">
        {costCode.name}
      </TableCell>
      <TableCell className="w-20 px-1">
        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-xs">
          Missing
        </Badge>
      </TableCell>
      <TableCell className="w-6 px-0">
        {/* No warnings column */}
      </TableCell>
      <TableCell className="w-32 px-1 text-left text-red-600 font-medium">
        $0
      </TableCell>
      <TableCell className="w-44 px-1 py-1"></TableCell>
      <TableCell className="w-32 px-1 text-muted-foreground">
        -
      </TableCell>
      {visibleColumns.historicalCosts && (
        <TableCell className="w-32 px-1 font-medium">
          {formatCurrency(historicalAmount)}
        </TableCell>
      )}
      {visibleColumns.variance && (
        <TableCell className="w-28 px-1">
          <span className="text-red-600">
            {formatVariance(variance)}
          </span>
        </TableCell>
      )}
    </TableRow>
  );
}
