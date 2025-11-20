import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { BulkActionBar } from '@/components/files/components/BulkActionBar';

const RowsRenderer = React.memo(function RowsRenderer({ rows }: { rows: React.ReactNode[] }) {
  return <>{rows}</>;
});

import { ActualTableHeader } from './ActualTableHeader';
import { ActualGroupHeader } from './ActualGroupHeader';
import { ActualTableRow } from './ActualTableRow';
import { ActualPrintToolbar } from './ActualPrintToolbar';
import { ActualTableFooter } from './ActualTableFooter';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useBudgetGroups } from '@/hooks/useBudgetGroups';
import { useBudgetMutations } from '@/hooks/useBudgetMutations';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { ViewCommittedCostsModal } from './ViewCommittedCostsModal';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useLotManagement } from '@/hooks/useLotManagement';

interface ActualTableProps {
  projectId: string;
  projectAddress?: string;
}

export function ActualTable({ projectId, projectAddress }: ActualTableProps) {
  const { selectedLotId } = useLotManagement(projectId);
  const { budgetItems, groupedBudgetItems } = useBudgetData(projectId, selectedLotId);
  const { purchaseOrders } = usePurchaseOrders(projectId, selectedLotId);
  
  const [committedModal, setCommittedModal] = useState<{
    open: boolean;
    costCode: { code: string; name: string } | null;
    purchaseOrders: PurchaseOrder[];
    projectId?: string;
  }>({
    open: false,
    costCode: null,
    purchaseOrders: [],
    projectId
  });
  
  const openCommittedModal = (args: { costCode: { code: string; name: string }, purchaseOrders: PurchaseOrder[], projectId?: string }) =>
    setCommittedModal({ open: true, costCode: args.costCode, purchaseOrders: args.purchaseOrders, projectId: args.projectId });
  
  const closeCommittedModal = () => setCommittedModal(m => ({ ...m, open: false }));
  
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
    removeGroupFromExpanded,
    expandAllGroups,
    collapseAllGroups
  } = useBudgetGroups(groupedBudgetItems);
  
  const { deletingGroups, deletingItems, handleUpdateActual, handleDeleteItem, handleDeleteGroup } = useBudgetMutations(projectId);

  const onGroupCheckboxChange = (group: string, checked: boolean) => {
    const groupItems = groupedBudgetItems[group] || [];
    const alreadySelected = isGroupSelected(groupItems);
    if (checked === alreadySelected) return; // no-op to avoid redundant updates
    handleGroupCheckboxChange(group, checked, groupItems);
  };

  const onDeleteGroup = (group: string) => {
    const groupItems = groupedBudgetItems[group] || [];
    handleDeleteGroup(group, groupItems);
    removeDeletedItemsFromSelection(groupItems);
    removeGroupFromExpanded(group);
  };

  const onDeleteItem = (itemId: string) => {
    handleDeleteItem(itemId);
  };

  const onBulkDelete = () => {
    const selectedBudgetItems = budgetItems.filter(item => selectedItems.has(item.id));
    selectedBudgetItems.forEach(item => {
      handleDeleteItem(item.id);
    });
  };

  const calculateGroupBudgetTotal = (groupItems: any[]) => {
    return groupItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
  };

  const calculateGroupCommittedTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + calculatePOByCostCode(item.cost_codes?.id), 0);
  };

  const calculateGroupActualTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + (item.actual_amount || 0), 0);
  };

  const handlePrint = () => {
    // Print logic for Actual table (similar to Budget)
    console.log('Print Actual');
  };

  const selectedCount = selectedItems.size;
  const isDeletingSelected = Array.from(selectedItems).some(id => deletingItems.has(id));

  const rows = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (const [group, items] of Object.entries(groupedBudgetItems)) {
      out.push(
        <ActualGroupHeader
          key={`g-${group}`}
          group={group}
          isExpanded={expandedGroups.has(group)}
          onToggle={handleGroupToggle}
          isSelected={isGroupSelected(items)}
          isPartiallySelected={isGroupPartiallySelected(items)}
          onCheckboxChange={onGroupCheckboxChange}
          groupBudgetTotal={calculateGroupBudgetTotal(items)}
          groupActualTotal={calculateGroupActualTotal(items)}
          groupCommittedTotal={calculateGroupCommittedTotal(items)}
          groupPurchaseOrders={items.flatMap(item => 
            purchaseOrders.filter(po => po.cost_code_id === item.cost_codes?.id)
          )}
          onShowCommitted={openCommittedModal}
          onDeleteGroup={onDeleteGroup}
          isDeleting={deletingGroups.has(group)}
        />
      );

      if (expandedGroups.has(group)) {
        for (const item of items as any[]) {
          out.push(
            <ActualTableRow
              key={item.id}
              item={item}
              committedAmount={calculatePOByCostCode(item.cost_codes?.id)}
              isSelected={selectedItems.has(item.id)}
              onCheckboxChange={handleItemCheckboxChange}
              purchaseOrders={purchaseOrders}
              onShowCommitted={openCommittedModal}
              onUpdateActual={handleUpdateActual}
              onDelete={onDeleteItem}
              isDeleting={deletingItems.has(item.id)}
            />
          );
        }
      }
    }
    return out;
  }, [
    groupedBudgetItems,
    expandedGroups,
    purchaseOrders,
    selectedItems,
    handleGroupToggle,
    onGroupCheckboxChange,
    handleItemCheckboxChange,
    isGroupSelected,
    isGroupPartiallySelected
  ]);

    return (
      <div className="space-y-4">
      <ActualPrintToolbar 
        projectId={projectId}
        onPrint={handlePrint} 
        budgetItems={budgetItems}
        onUpdateActual={handleUpdateActual}
        onExpandAll={expandAllGroups}
        onCollapseAll={collapseAllGroups}
      />

      {selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selectedCount}
          selectedFolderCount={0}
          onBulkDelete={onBulkDelete}
          isDeleting={isDeletingSelected}
        />
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <ActualTableHeader />
          <TableBody>
            {budgetItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No budget items added yet.
                </TableCell>
              </TableRow>
            ) : (
              <RowsRenderer rows={rows} />
            )}
          </TableBody>
        </Table>
      </div>

      <ViewCommittedCostsModal
        isOpen={committedModal.open}
        onClose={closeCommittedModal}
        costCode={committedModal.costCode ?? { code: '', name: '' }}
        purchaseOrders={committedModal.purchaseOrders}
        projectId={committedModal.projectId}
      />

      <ActualTableFooter budgetItems={budgetItems} purchaseOrders={purchaseOrders} />
    </div>
  );
}