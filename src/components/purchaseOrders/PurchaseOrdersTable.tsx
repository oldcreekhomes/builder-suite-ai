import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CreatePurchaseOrderDialog } from '../CreatePurchaseOrderDialog';
import { PurchaseOrdersTableHeader } from './PurchaseOrdersTableHeader';
import { PurchaseOrdersGroupHeader } from './PurchaseOrdersGroupHeader';
import { PurchaseOrdersTableRow } from './PurchaseOrdersTableRow';
import { PurchaseOrdersTableFooter } from './PurchaseOrdersTableFooter';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useBudgetGroups } from '@/hooks/useBudgetGroups';
import { usePurchaseOrderMutations } from '@/hooks/usePurchaseOrderMutations';

interface PurchaseOrdersTableProps {
  projectId: string;
  projectAddress?: string;
}

export function PurchaseOrdersTable({ projectId, projectAddress }: PurchaseOrdersTableProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  
  const { purchaseOrders, groupedPurchaseOrders } = usePurchaseOrders(projectId);
  
  const {
    expandedGroups,
    selectedItems,
    handleGroupToggle,
    handleGroupCheckboxChange,
    handleItemCheckboxChange,
    isGroupSelected,
    isGroupPartiallySelected,
    removeDeletedItemsFromSelection,
    removeGroupFromExpanded
  } = useBudgetGroups(groupedPurchaseOrders);
  
  const { 
    deletingGroups, 
    deletingItems, 
    handleDeleteItem, 
    handleDeleteGroup, 
    handleUpdateStatus, 
    handleUpdateNotes 
  } = usePurchaseOrderMutations(projectId);

  const handleEditOrder = (order: any) => {
    setEditingOrder(order);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingOrder(null);
  };

  const onDeleteGroup = (group: string) => {
    const groupItems = groupedPurchaseOrders[group] || [];
    handleDeleteGroup(group, groupItems);
    
    // Clean up UI state after deletion
    removeDeletedItemsFromSelection(groupItems);
    removeGroupFromExpanded(group);
  };

  const onDeleteItem = (itemId: string) => {
    handleDeleteItem(itemId);
    
    // Clean up UI state after deletion
    const newSelectedItems = new Set(selectedItems);
    newSelectedItems.delete(itemId);
  };

  const onGroupCheckboxChange = (group: string, checked: boolean) => {
    const groupItems = groupedPurchaseOrders[group] || [];
    handleGroupCheckboxChange(group, checked, groupItems);
  };

  const getEmptyStateMessage = () => {
    return 'No purchase orders yet.';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setShowCreateModal(true)}>
          Create Purchase Order
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <PurchaseOrdersTableHeader />
          <TableBody>
            {purchaseOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {getEmptyStateMessage()}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {Object.entries(groupedPurchaseOrders).map(([group, items]) => [
                  <PurchaseOrdersGroupHeader
                    key={`header-${group}`}
                    group={group}
                    isExpanded={expandedGroups.has(group)}
                    onToggle={handleGroupToggle}
                    isSelected={isGroupSelected(items)}
                    isPartiallySelected={isGroupPartiallySelected(items)}
                    onCheckboxChange={onGroupCheckboxChange}
                    onDeleteGroup={onDeleteGroup}
                    isDeleting={deletingGroups.has(group)}
                  />,
                  
                  ...(expandedGroups.has(group) ? items.map((item) => (
                    <PurchaseOrdersTableRow
                      key={item.id}
                      item={item}
                      onDelete={onDeleteItem}
                      onUpdateStatus={handleUpdateStatus}
                      onUpdateNotes={handleUpdateNotes}
                      isSelected={selectedItems.has(item.id)}
                      onCheckboxChange={handleItemCheckboxChange}
                      isDeleting={deletingItems.has(item.id)}
                      projectAddress={projectAddress}
                      onEditClick={handleEditOrder}
                    />
                  )) : [])
                ]).flat()}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <PurchaseOrdersTableFooter purchaseOrders={purchaseOrders} />

      <CreatePurchaseOrderDialog
        open={showCreateModal}
        onOpenChange={handleCloseModal}
        projectId={projectId}
        onSuccess={() => window.location.reload()}
        editOrder={editingOrder}
      />
    </div>
  );
}