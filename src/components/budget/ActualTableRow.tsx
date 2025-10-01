import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface ActualTableRowProps {
  item: any;
  committedAmount: number;
  isSelected: boolean;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
}

export function ActualTableRow({
  item,
  committedAmount,
  isSelected,
  onCheckboxChange
}: ActualTableRowProps) {
  const costCode = item.cost_codes as CostCode;
  const budgetTotal = (item.quantity || 0) * (item.unit_price || 0);
  const variance = budgetTotal - committedAmount; // Budget - Committed Costs

  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const getVarianceColor = (variance: number) => {
    if (variance < 0) return 'text-red-600'; // Over budget (negative)
    if (variance > 0) return 'text-green-600'; // Under budget (positive)
    return 'text-gray-600'; // On budget
  };

  return (
    <TableRow className={`h-8 ${isSelected ? 'bg-blue-50' : ''}`}>
      <TableCell className="px-1 py-0 w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onCheckboxChange(item.id, checked as boolean)}
          className="h-3 w-3"
        />
      </TableCell>
      <TableCell className="px-1 py-0" style={{ paddingLeft: '50px' }}>
        <div className="text-xs font-medium">
          {costCode?.code || '-'}
        </div>
      </TableCell>
      <TableCell className="px-1 py-0">
        <div className="text-xs">
          {costCode?.name || '-'}
        </div>
      </TableCell>
      <TableCell className="px-1 py-0">
        <div className="text-xs font-medium">
          {formatCurrency(budgetTotal)}
        </div>
      </TableCell>
      <TableCell className="px-1 py-0">
        <div className="text-xs">
          {formatCurrency(committedAmount)}
        </div>
      </TableCell>
      <TableCell className="px-1 py-0">
        <div className={`text-xs font-medium ${getVarianceColor(variance)}`}>
          {formatCurrency(variance)}
        </div>
      </TableCell>
    </TableRow>
  );
}