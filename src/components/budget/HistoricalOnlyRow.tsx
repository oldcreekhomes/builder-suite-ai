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
      <TableCell className="w-12">
        <Checkbox disabled checked={false} />
      </TableCell>
      <TableCell className="w-40 font-medium pl-12">
        {costCode.code}
      </TableCell>
      <TableCell className="w-[320px]">
        {costCode.name}
      </TableCell>
      <TableCell className="w-48">
        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-xs">
          Missing
        </Badge>
      </TableCell>
      <TableCell className="w-10 px-0">
        {/* No warnings column */}
      </TableCell>
      <TableCell className="w-52 text-left text-red-600 font-medium">
        $0
      </TableCell>
      <TableCell className="w-32 text-muted-foreground">
        -
      </TableCell>
      {visibleColumns.historicalCosts && (
        <TableCell className="w-52 font-medium">
          {formatCurrency(historicalAmount)}
        </TableCell>
      )}
      {visibleColumns.variance && (
        <TableCell className="w-48">
          <span className="text-red-600">
            {formatVariance(variance)}
          </span>
        </TableCell>
      )}
    </TableRow>
  );
}
