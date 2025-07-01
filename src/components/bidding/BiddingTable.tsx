
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AddBiddingModal } from './AddBiddingModal';
import { BiddingTableHeader } from './BiddingTableHeader';
import { BiddingGroupHeader } from './BiddingGroupHeader';
import { BiddingTableRow } from './BiddingTableRow';
import { BiddingTableFooter } from './BiddingTableFooter';
import { useBiddingData } from '@/hooks/useBiddingData';
import { useBudgetGroups } from '@/hooks/useBudgetGroups';
import { useBiddingMutations } from '@/hooks/useBiddingMutations';
import { formatUnitOfMeasure } from '@/utils/budgetUtils';

interface BiddingTableProps {
  projectId: string;
  projectAddress?: string;
  status: 'draft' | 'sent' | 'closed';
}

export function BiddingTable({ projectId, projectAddress, status }: BiddingTableProps) {
  const [showAddBiddingModal, setShowAddBiddingModal] = useState(false);
  
  const { biddingItems, groupedBiddingItems, existingCostCodeIds } = useBiddingData(projectId, status);
  
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
  
  const { deletingGroups, deletingItems, handleUpdateItem, handleDeleteItem, handleDeleteGroup } = useBiddingMutations(projectId);

  const onDeleteGroup = (group: string) => {
    const groupItems = groupedBiddingItems[group] || [];
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
    const groupItems = groupedBiddingItems[group] || [];
    handleGroupCheckboxChange(group, checked, groupItems);
  };

  const getEmptyStateMessage = () => {
    switch (status) {
      case 'draft':
        return 'No draft bid packages yet.';
      case 'sent':
        return 'No sent bid packages yet.';
      case 'closed':
        return 'No closed bid packages yet.';
      default:
        return 'No bid packages found.';
    }
  };

  const getLoadButtonText = () => {
    return status === 'draft' ? 'Load Bid Package' : 'View Bid Packages';
  };

  return (
    <div className="space-y-4">
      {status === 'draft' && (
        <div className="flex items-center justify-end">
          <Button onClick={() => setShowAddBiddingModal(true)}>
            {getLoadButtonText()}
          </Button>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <BiddingTableHeader />
          <TableBody>
            {biddingItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  {getEmptyStateMessage()}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {Object.entries(groupedBiddingItems).map(([group, items]) => (
                  <React.Fragment key={group}>
                    <BiddingGroupHeader
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
                      <BiddingTableRow
                        key={item.id}
                        item={item}
                        onUpdate={handleUpdateItem}
                        onDelete={onDeleteItem}
                        formatUnitOfMeasure={formatUnitOfMeasure}
                        isSelected={selectedItems.has(item.id)}
                        onCheckboxChange={handleItemCheckboxChange}
                        isDeleting={deletingItems.has(item.id)}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <BiddingTableFooter biddingItems={biddingItems} />

      {status === 'draft' && (
        <AddBiddingModal
          projectId={projectId}
          open={showAddBiddingModal}
          onOpenChange={setShowAddBiddingModal}
          existingCostCodeIds={existingCostCodeIds}
        />
      )}
    </div>
  );
}
