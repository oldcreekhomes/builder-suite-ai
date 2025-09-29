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
      <TableCell className="px-1 py-0 text-right">
        <div className="text-xs font-medium">
          {formatCurrency(budgetTotal)}
        </div>
      </TableCell>
      <TableCell className="px-1 py-0 text-right">
        {isEditingActual ? (
          <input
            type="number"
            value={actualValue}
            onChange={(e) => setActualValue(e.target.value)}
            onBlur={handleActualBlur}
            onKeyDown={handleActualKeyDown}
            className="bg-transparent border-none outline-none text-xs w-full p-0 focus:ring-0 focus:border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            style={{ caretColor: "black", fontSize: "inherit", fontFamily: "inherit" }}
            autoFocus
          />
        ) : (
          <span 
            className="cursor-text hover:bg-muted rounded px-1 py-0.5 inline-block text-xs text-black whitespace-nowrap"
            onClick={handleActualClick}
          >
            {formatCurrency(actualAmount)}
          </span>
        )}
      </TableCell>
      <TableCell className="px-1 py-0 text-right">
        <div className={`text-xs font-medium ${getVarianceColor(variance)}`}>
          {formatCurrency(variance)}
        </div>
      </TableCell>
    </TableRow>
  );
}