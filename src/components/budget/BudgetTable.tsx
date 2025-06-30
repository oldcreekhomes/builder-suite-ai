
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AddBudgetModal } from './AddBudgetModal';
import { BudgetTableHeader } from './BudgetTableHeader';
import { BudgetGroupHeader } from './BudgetGroupHeader';
import { BudgetTableRow } from './BudgetTableRow';
import { BudgetTableFooter } from './BudgetTableFooter';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useBudgetGroups } from '@/hooks/useBudgetGroups';
import { useBudgetMutations } from '@/hooks/useBudgetMutations';
import { formatUnitOfMeasure } from '@/utils/budgetUtils';

interface BudgetTableProps {
  projectId: string;
}

export function BudgetTable({ projectId }: BudgetTableProps) {
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  
  const { budgetItems, groupedBudgetItems, existingCostCodeIds } = useBudgetData(projectId);
  
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
  
  const { deletingGroups, handleUpdateItem, handleDeleteGroup } = useBudgetMutations(projectId);

  const onDeleteGroup = (group: string) => {
    const groupItems = groupedBudgetItems[group] || [];
    handleDeleteGroup(group, groupItems);
    
    // Clean up UI state after deletion
    removeDeletedItemsFromSelection(groupItems);
    removeGroupFromExpanded(group);
  };

  const onGroupCheckboxChange = (group: string, checked: boolean) => {
    const groupItems = groupedBudgetItems[group] || [];
    handleGroupCheckboxChange(group, checked, groupItems);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Project Budget</h3>
        <Button onClick={() => setShowAddBudgetModal(true)}>
          Add Budget
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <BudgetTableHeader />
          <TableBody>
            {budgetItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No budget items added yet.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {Object.entries(groupedBudgetItems).map(([group, items]) => (
                  <React.Fragment key={group}>
                    <BudgetGroupHeader
                      group={group}
                      isExpanded={expandedGroups.has(group)}
                      onToggle={handleGroupToggle}
                      isSelected={isGroupSelected(items)}
                      isPartiallySelected={isGroupPartiallySelected(items)}
                      onCheckboxChange={onGroupCheckboxChange}
                      onEditGroup={() => {}}
                      onDeleteGroup={onDeleteGroup}
                      isDeleting={deletingGroups.has(group)}
                      groupTotal={calculateGroupTotal(items)}
                    />
                    
                    {expandedGroups.has(group) && items.map((item) => (
                      <BudgetTableRow
                        key={item.id}
                        item={item}
                        onUpdate={handleUpdateItem}
                        formatUnitOfMeasure={formatUnitOfMeasure}
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

      <BudgetTableFooter budgetItems={budgetItems} />

      <AddBudgetModal
        projectId={projectId}
        open={showAddBudgetModal}
        onOpenChange={setShowAddBudgetModal}
        existingCostCodeIds={existingCostCodeIds}
      />
    </div>
  );
}
