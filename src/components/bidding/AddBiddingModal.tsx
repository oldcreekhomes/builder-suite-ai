
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAddBiddingModal } from '@/hooks/useAddBiddingModal';
import { ExpandCollapseControls } from '../budget/ExpandCollapseControls';
import { CostCodeGroup } from '../budget/CostCodeGroup';

interface AddBiddingModalProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCostCodeIds: string[];
}

export function AddBiddingModal({ projectId, open, onOpenChange, existingCostCodeIds }: AddBiddingModalProps) {
  const {
    selectedCostCodes,
    expandedGroups,
    groupedCostCodes,
    createBiddingItems,
    handleCostCodeToggle,
    handleGroupCheckboxChange,
    isGroupSelected,
    isGroupPartiallySelected,
    handleExpandAll,
    handleCollapseAll,
    handleGroupToggle,
    handleSave,
    resetSelection,
  } = useAddBiddingModal(projectId, existingCostCodeIds);

  const handleCancel = () => {
    resetSelection();
    onOpenChange(false);
  };

  const handleSaveAndClose = () => {
    handleSave();
    onOpenChange(false);
  };

  const handleCostCodeToggleWrapper = (costCodeId: string, checked: boolean) => {
    handleCostCodeToggle(costCodeId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Load Bid Packages</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          <ExpandCollapseControls
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
          />

          <div className="space-y-2">
            {Object.entries(groupedCostCodes).map(([group, codes]) => (
              <CostCodeGroup
                key={group}
                group={group}
                codes={codes}
                isExpanded={expandedGroups.has(group)}
                isGroupSelected={isGroupSelected(group)}
                isGroupPartiallySelected={isGroupPartiallySelected(group)}
                selectedCostCodes={selectedCostCodes}
                onGroupToggle={handleGroupToggle}
                onGroupCheckboxChange={handleGroupCheckboxChange}
                onCostCodeToggle={handleCostCodeToggleWrapper}
              />
            ))}
          </div>

          {Object.keys(groupedCostCodes).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              All bidding cost codes have been loaded to the project.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveAndClose}
            disabled={selectedCostCodes.size === 0 || createBiddingItems.isPending}
          >
            Load Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
