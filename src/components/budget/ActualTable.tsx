import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ActualTableHeader } from './ActualTableHeader';
import { ActualGroupHeader } from './ActualGroupHeader';
import { ActualTableRow } from './ActualTableRow';
import { ActualPrintToolbar } from './ActualPrintToolbar';
import { ActualTableFooter } from './ActualTableFooter';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useBudgetGroups } from '@/hooks/useBudgetGroups';
import { useBudgetMutations } from '@/hooks/useBudgetMutations';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';

interface ActualTableProps {
  projectId: string;
  projectAddress?: string;
}

export function ActualTable({ projectId, projectAddress }: ActualTableProps) {
  const { budgetItems, groupedBudgetItems } = useBudgetData(projectId);
  const { purchaseOrders } = usePurchaseOrders(projectId);
  
  // Calculate total PO amount by cost code
  const calculatePOByCostCode = (costCodeId: string) => {
    return purchaseOrders
      .filter(po => po.cost_code_id === costCodeId)
      .reduce((sum, po) => sum + (po.total_amount || 0), 0);
  };
  
  const {
    expandedGroups,
    selectedItems,
    handleGroupToggle,
    handleGroupCheckboxChange,
    handleItemCheckboxChange,
    isGroupSelected,
    isGroupPartiallySelected,
    calculateGroupTotal,
    removeDeletedItemsFromSelection,
    removeGroupFromExpanded
  } = useBudgetGroups();
  
  const { handleUpdateActual } = useBudgetMutations(projectId);

  const onGroupCheckboxChange = (group: string, checked: boolean) => {
    const groupItems = groupedBudgetItems[group] || [];
    handleGroupCheckboxChange(group, checked, groupItems);
  };

  const calculateGroupBudgetTotal = (groupItems: any[]) => {
    return groupItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
  };

  const calculateGroupCommittedTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + calculatePOByCostCode(item.cost_codes?.id), 0);
  };

  const handlePrint = () => {
    // Print logic for Actual table (similar to Budget)
    console.log('Print Actual');
  };

  return (
    <div className="space-y-4">
      <ActualPrintToolbar 
        onPrint={handlePrint} 
        budgetItems={budgetItems}
        onUpdateActual={handleUpdateActual}
      />

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <ActualTableHeader />
          <TableBody>
            {budgetItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No budget items added yet.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {Object.entries(groupedBudgetItems).map(([group, items]) => [
                  <ActualGroupHeader
                    key={`header-${group}`}
                    group={group}
                    isExpanded={expandedGroups.has(group)}
                    onToggle={handleGroupToggle}
                    isSelected={isGroupSelected(items)}
                    isPartiallySelected={isGroupPartiallySelected(items)}
                    onCheckboxChange={onGroupCheckboxChange}
                    groupBudgetTotal={calculateGroupBudgetTotal(items)}
                    groupCommittedTotal={calculateGroupCommittedTotal(items)}
                    groupPurchaseOrders={items.flatMap(item => 
                      purchaseOrders.filter(po => po.cost_code_id === item.cost_codes?.id)
                    )}
                  />,
                  ...(expandedGroups.has(group) ? items.map((item) => (
                    <ActualTableRow
                      key={item.id}
                      item={item}
                      committedAmount={calculatePOByCostCode(item.cost_codes?.id)}
                      isSelected={selectedItems.has(item.id)}
                      onCheckboxChange={handleItemCheckboxChange}
                      purchaseOrders={purchaseOrders}
                    />
                  )) : [])
                ])}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <ActualTableFooter budgetItems={budgetItems} purchaseOrders={purchaseOrders} />
    </div>
  );
}