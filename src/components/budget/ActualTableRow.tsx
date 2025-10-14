import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { MinimalCheckbox } from '@/components/ui/minimal-checkbox';
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
}

export function ActualTableRow({
  item,
  committedAmount,
  isSelected,
  onCheckboxChange,
  purchaseOrders,
  onShowCommitted
}: ActualTableRowProps) {
  
  const costCode = item.cost_codes as CostCode;
  const budgetTotal = (item.quantity || 0) * (item.unit_price || 0);
  const variance = budgetTotal - committedAmount; // Budget - Committed Costs

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

  return (
    
      <TableRow className={`h-8 ${isSelected ? 'bg-blue-50' : ''}`}>
        <TableCell className="px-1 py-0 w-12">
          <MinimalCheckbox
            checked={isSelected}
            onChange={(e) => onCheckboxChange(item.id, e.currentTarget.checked)}
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
      </TableRow>

    
  );
}