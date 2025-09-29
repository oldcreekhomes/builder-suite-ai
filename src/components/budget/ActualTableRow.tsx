import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface ActualTableRowProps {
  item: any;
  onUpdateActual: (id: string, actual_amount: number) => void;
  isSelected: boolean;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
}

export function ActualTableRow({
  item,
  onUpdateActual,
  isSelected,
  onCheckboxChange
}: ActualTableRowProps) {
  const [isEditingActual, setIsEditingActual] = useState(false);
  const [actualValue, setActualValue] = useState('');

  const costCode = item.cost_codes as CostCode;
  const budgetTotal = (item.quantity || 0) * (item.unit_price || 0);
  const actualAmount = (item as any).actual_amount || 0;
  const variance = actualAmount - budgetTotal;

  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-red-600'; // Over budget
    if (variance < 0) return 'text-green-600'; // Under budget
    return 'text-gray-600'; // On budget
  };

  const handleActualClick = () => {
    setIsEditingActual(true);
    setActualValue(actualAmount.toString());
  };

  const handleActualBlur = () => {
    const numericValue = parseFloat(actualValue) || 0;
    onUpdateActual(item.id, numericValue);
    setIsEditingActual(false);
  };

  const handleActualKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleActualBlur();
    } else if (e.key === 'Escape') {
      setIsEditingActual(false);
    }
  };

  return (
    <TableRow className="h-8 hover:bg-gray-50/50">
      <TableCell className="h-8 px-1 py-0 w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onCheckboxChange(item.id, checked as boolean)}
          className="h-4 w-4"
        />
      </TableCell>
      <TableCell className="h-8 px-1 py-0 text-xs">
        {costCode?.code || '-'}
      </TableCell>
      <TableCell className="h-8 px-1 py-0 text-xs">
        {costCode?.name || '-'}
      </TableCell>
      <TableCell className="h-8 px-1 py-0 text-xs text-right">
        {formatCurrency(budgetTotal)}
      </TableCell>
      <TableCell 
        className="h-8 px-1 py-0 text-xs text-right cursor-pointer hover:bg-gray-100/50"
        onClick={handleActualClick}
      >
        {isEditingActual ? (
          <Input
            type="number"
            value={actualValue}
            onChange={(e) => setActualValue(e.target.value)}
            onBlur={handleActualBlur}
            onKeyDown={handleActualKeyDown}
            className="h-6 border-none shadow-none bg-transparent text-xs p-0 text-right focus:ring-0"
            autoFocus
          />
        ) : (
          <span>{formatCurrency(actualAmount)}</span>
        )}
      </TableCell>
      <TableCell className={`h-8 px-1 py-0 text-xs text-right ${getVarianceColor(variance)}`}>
        {formatCurrency(variance)}
      </TableCell>
    </TableRow>
  );
}