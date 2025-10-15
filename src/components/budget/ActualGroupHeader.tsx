import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteButton } from '@/components/ui/delete-button';
import { ChevronDown } from 'lucide-react';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';


interface ActualGroupHeaderProps {
  group: string;
  isExpanded: boolean;
  onToggle: (group: string) => void;
  isSelected: boolean;
  isPartiallySelected: boolean;
  onCheckboxChange: (group: string, checked: boolean) => void;
  groupBudgetTotal: number;
  groupActualTotal: number;
  groupCommittedTotal: number;
  groupPurchaseOrders?: PurchaseOrder[];
  onShowCommitted: (args: { costCode: { code: string; name: string }, purchaseOrders: PurchaseOrder[], projectId?: string }) => void;
  onDeleteGroup: (group: string) => void;
  isDeleting?: boolean;
}

export function ActualGroupHeader({
  group,
  isExpanded,
  onToggle,
  isSelected,
  isPartiallySelected,
  onCheckboxChange,
  groupBudgetTotal,
  groupActualTotal,
  groupCommittedTotal,
  groupPurchaseOrders = [],
  onShowCommitted,
  onDeleteGroup,
  isDeleting = false
}: ActualGroupHeaderProps) {
  

  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const calculateVariance = (budget: number, actual: number, committed: number) => {
    return budget - actual - committed; // Budget - Actual Cost - Committed Costs
  };

  const getVarianceColor = (variance: number) => {
    if (variance < 0) return 'text-red-600'; // Over budget (negative)
    if (variance > 0) return 'text-green-600'; // Under budget (positive)
    return 'text-gray-600'; // On budget
  };

  const variance = calculateVariance(groupBudgetTotal, groupActualTotal, groupCommittedTotal);

  return (
      <TableRow className="bg-gray-50 h-8" key={`row-${group}`}>
        <TableCell className="px-1 py-0 w-12">
          <Checkbox
            checked={isSelected}
            ref={(el) => {
              if (el && 'indeterminate' in el) {
                (el as any).indeterminate = isPartiallySelected && !isSelected;
              }
            }}
            onCheckedChange={(checked) => onCheckboxChange(group, checked as boolean)}
            className="h-3 w-3"
          />
        </TableCell>
        <TableCell 
          colSpan={2} 
          className="px-1 py-0 cursor-pointer hover:bg-gray-100"
          onClick={() => onToggle(group)}
        >
          <div className="flex items-center text-xs font-medium">
            <ChevronDown 
              className={`h-3 w-3 mr-2 transition-transform ${
                isExpanded ? 'rotate-0' : '-rotate-90'
              }`} 
            />
            {group}
          </div>
        </TableCell>
        <TableCell className="px-2 py-0 w-28">
          <div className="text-xs font-medium">
            {formatCurrency(groupBudgetTotal)}
          </div>
        </TableCell>
        <TableCell className="px-2 py-0 w-28">
          <div className="text-xs font-medium">
            {formatCurrency(groupActualTotal)}
          </div>
        </TableCell>
        <TableCell 
          className="px-2 py-0 w-32 cursor-pointer hover:bg-gray-100"
          onClick={() => onShowCommitted({
            costCode: { code: group, name: '' },
            purchaseOrders: groupPurchaseOrders,
            projectId: groupPurchaseOrders[0]?.project_id
          })}
        >
          <div className="text-xs font-medium">
            {formatCurrency(groupCommittedTotal)}
          </div>
        </TableCell>
        <TableCell className="px-2 py-0 w-24">
          <div className={`text-xs font-medium ${getVarianceColor(variance)}`}>
            {formatCurrency(variance)}
          </div>
        </TableCell>
        <TableCell className="px-1 py-0 w-20 sticky right-0 bg-gray-50 z-20">
          <div className="flex justify-center">
            {isSelected && (
              <DeleteButton
                onDelete={() => onDeleteGroup(group)}
                title="Delete Group"
                description={`Are you sure you want to delete all budget items in the "${group}" group? This action cannot be undone.`}
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