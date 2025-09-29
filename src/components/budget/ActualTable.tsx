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

interface ActualTableProps {
  projectId: string;
  projectAddress?: string;
}

export function ActualTable({ projectId, projectAddress }: ActualTableProps) {
  const { budgetItems, groupedBudgetItems } = useBudgetData(projectId);
  
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

  const calculateGroupActualTotal = (groupItems: any[]) => {
    return groupItems.reduce((sum, item) => sum + ((item as any).actual_amount || 0), 0);
  };

  const handlePrint = () => {
    // Print logic for Actual table (similar to Budget)
    console.log('Print Actual');
  };

  return (
    <div className="space-y-4">
      <ActualPrintToolbar onPrint={handlePrint} />

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
                {Object.entries(groupedBudgetItems).map(([group, items]) => (
                  <React.Fragment key={group}>
                    <ActualGroupHeader
                      group={group}
                      isExpanded={expandedGroups.has(group)}
                      onToggle={handleGroupToggle}
                      isSelected={isGroupSelected(items)}
                      isPartiallySelected={isGroupPartiallySelected(items)}
                      onCheckboxChange={onGroupCheckboxChange}
                      groupBudgetTotal={calculateGroupBudgetTotal(items)}
                      groupActualTotal={calculateGroupActualTotal(items)}
                    />
                    
                    {expandedGroups.has(group) && items.map((item) => (
                      <ActualTableRow
                        key={item.id}
                        item={item}
                        onUpdateActual={handleUpdateActual}
                        isSelected={selectedItems.has(item.id)}
                        onCheckboxChange={handleItemCheckboxChange}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <ActualTableFooter budgetItems={budgetItems} />
    </div>
  );
}