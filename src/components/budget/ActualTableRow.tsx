import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteButton } from '@/components/ui/delete-button';
import type { Tables } from '@/integrations/supabase/types';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';


type CostCode = Tables<'cost_codes'>;

interface ActualTableRowProps {
  item: any;
  committedAmount: number;
  isSelected: boolean;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
  purchaseOrders: PurchaseOrder[];
  onShowCommitted: (args: { costCode: { code: string; name: string }, purchaseOrders: PurchaseOrder[], projectId?: string }) => void;
  onUpdateActual?: (itemId: string, amount: number) => void;
  onDelete: (itemId: string) => void;
  isDeleting?: boolean;
}

export function ActualTableRow({
  item,
  committedAmount,
  isSelected,
  onCheckboxChange,
  purchaseOrders,
  onShowCommitted,
  onUpdateActual,
  onDelete,
  isDeleting = false
}: ActualTableRowProps) {
  const [isEditingActual, setIsEditingActual] = useState(false);
  const [actualValue, setActualValue] = useState(item.actual_amount?.toString() || '');
  
  const costCode = item.cost_codes as CostCode;
  const budgetTotal = (item.quantity || 0) * (item.unit_price || 0);
  const actualCost = item.actual_amount || 0;
  const variance = budgetTotal - actualCost - committedAmount; // Budget - Actual Cost - Committed Costs

  // Filter purchase orders for this cost code
  const costCodePOs = purchaseOrders.filter(po => po.cost_code_id === costCode?.id);

  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const getVarianceColor = (variance: number) => {
    if (variance < 0) return 'text-red-600'; // Over budget (negative)
    if (variance > 0) return 'text-green-600'; // Under budget (positive)
    return 'text-gray-600'; // On budget
  };

  const handleActualBlur = () => {
    setIsEditingActual(false);
    const numericValue = parseFloat(actualValue) || 0;
    if (numericValue !== (item.actual_amount || 0)) {
      onUpdateActual?.(item.id, numericValue);
    }
  };

  const handleActualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    
      <TableRow className={`h-8 ${isSelected ? 'bg-blue-50' : ''}`}>
        <TableCell className="px-1 py-0 w-12">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onCheckboxChange(item.id, checked as boolean)}
            tabIndex={-1}
            className="h-3 w-3"
          />
        </TableCell>
        <TableCell className="px-1 py-0 w-20" style={{ paddingLeft: '50px' }}>
          <div className="text-xs font-medium">
            {costCode?.code || '-'}
          </div>
        </TableCell>
        <TableCell className="px-1 py-0 w-48">
          <div className="text-xs">
            {costCode?.name || '-'}
          </div>
        </TableCell>
        <TableCell className="px-2 py-0 w-28">
          <div className="text-xs font-medium">
            {formatCurrency(budgetTotal)}
          </div>
        </TableCell>
        <TableCell className="px-2 py-0 w-28">
          {isEditingActual ? (
            <input
              type="number"
              step="0.01"
              value={actualValue}
              onChange={(e) => setActualValue(e.target.value)}
              onBlur={handleActualBlur}
              onKeyDown={handleActualKeyDown}
              className="w-full px-1 py-0.5 text-xs border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <div 
              className="text-xs cursor-pointer hover:bg-muted/50 rounded px-1"
              onClick={() => setIsEditingActual(true)}
            >
              {formatCurrency(actualCost)}
            </div>
          )}
        </TableCell>
        <TableCell 
          className="px-2 py-0 w-32 cursor-pointer hover:bg-muted/50"
          onClick={() => onShowCommitted({
            costCode: { code: costCode?.code || '-', name: costCode?.name || '-' },
            purchaseOrders: costCodePOs,
            projectId: item.project_id
          })}
        >
          <div className="text-xs">
            {formatCurrency(committedAmount)}
          </div>
        </TableCell>
        <TableCell className="px-2 py-0 w-24">
          <div className={`text-xs font-medium ${getVarianceColor(variance)}`}>
            {formatCurrency(variance)}
          </div>
        </TableCell>
        <TableCell className={`px-1 py-0 w-20 sticky right-0 z-30 ${isSelected ? 'bg-blue-50' : 'bg-background'}`}>
          <div className="flex items-center justify-center">
            {isSelected && (
              <DeleteButton
                onDelete={() => onDelete(item.id)}
                title="Delete Budget Item"
                description="Are you sure you want to delete this budget item? This action cannot be undone."
                size="sm"
                variant="ghost"
                isLoading={isDeleting}
                showIcon={true}
              />
            )}
          </div>
        </TableCell>
      </TableRow>

    
  );
}