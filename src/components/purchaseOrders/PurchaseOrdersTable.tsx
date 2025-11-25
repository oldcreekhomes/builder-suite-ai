import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { CreatePurchaseOrderDialog } from '../CreatePurchaseOrderDialog';
import { PurchaseOrdersTableHeader } from './PurchaseOrdersTableHeader';
import { PurchaseOrdersGroupHeader } from './PurchaseOrdersGroupHeader';
import { PurchaseOrdersTableRow } from './PurchaseOrdersTableRow';
import { PurchaseOrdersTableFooter } from './PurchaseOrdersTableFooter';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useBudgetGroups } from '@/hooks/useBudgetGroups';
import { usePurchaseOrderMutations } from '@/hooks/usePurchaseOrderMutations';
import { useLotManagement } from '@/hooks/useLotManagement';

interface PurchaseOrdersTableProps {
  projectId: string;
  projectAddress?: string;
}

export function PurchaseOrdersTable({ projectId, projectAddress }: PurchaseOrdersTableProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { selectedLotId } = useLotManagement(projectId);
  const { purchaseOrders, groupedPurchaseOrders } = usePurchaseOrders(projectId, selectedLotId);
  
  // Filter purchase orders based on search query
  const filteredPurchaseOrders = useMemo(() => {
    if (!searchQuery.trim()) return purchaseOrders;
    
    const query = searchQuery.toLowerCase();
    return purchaseOrders.filter(po => 
      po.companies?.company_name?.toLowerCase().includes(query) ||
      po.cost_codes?.code?.toLowerCase().includes(query) ||
      po.cost_codes?.name?.toLowerCase().includes(query) ||
      po.status?.toLowerCase().includes(query) ||
      po.notes?.toLowerCase().includes(query)
    );
  }, [purchaseOrders, searchQuery]);
  
  // Group filtered purchase orders
  const filteredGroupedPurchaseOrders = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    filteredPurchaseOrders.forEach(po => {
      const group = po.cost_codes?.parent_group || po.cost_codes?.category || 'Uncategorized';
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(po);
    });
    return grouped;
  }, [filteredPurchaseOrders]);
  
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
    const groupItems = filteredGroupedPurchaseOrders[group] || [];
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
    const groupItems = filteredGroupedPurchaseOrders[group] || [];
    handleGroupCheckboxChange(group, checked, groupItems);
  };

  const getEmptyStateMessage = () => {
    return 'No purchase orders yet.';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search purchase orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          Create Purchase Order
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <PurchaseOrdersTableHeader />
          <TableBody>
            {filteredPurchaseOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No purchase orders found matching your search.' : getEmptyStateMessage()}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {Object.entries(filteredGroupedPurchaseOrders).map(([group, items]) => [
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
                    hasChildren={items.length > 0}
                  />,
                  
                  ...(expandedGroups.has(group) ? items.map((item) => (
                     <PurchaseOrdersTableRow
                       key={item.id}
                       item={item}
                       onDelete={onDeleteItem}
                       onUpdateNotes={handleUpdateNotes}
                       isSelected={selectedItems.has(item.id)}
                       onCheckboxChange={handleItemCheckboxChange}
                       isDeleting={deletingItems.has(item.id)}
                       projectAddress={projectAddress}
                       projectId={projectId}
                       onEditClick={handleEditOrder}
                     />
                  )) : [])
                ]).flat()}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <PurchaseOrdersTableFooter purchaseOrders={filteredPurchaseOrders} />

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