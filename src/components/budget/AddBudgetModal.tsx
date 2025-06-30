
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAddBudgetModal } from '@/hooks/useAddBudgetModal';
import { ExpandCollapseControls } from './ExpandCollapseControls';
import { CostCodeGroup } from './CostCodeGroup';

interface AddBudgetModalProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCostCodeIds: string[];
}

export function AddBudgetModal({ projectId, open, onOpenChange, existingCostCodeIds }: AddBudgetModalProps) {
  const {
    selectedCostCodes,
    expandedGroups,
    groupedCostCodes,
    createBudgetItems,
    handleCostCodeToggle,
    handleGroupCheckboxChange,
    isGroupSelected,
    isGroupPartiallySelected,
    handleExpandAll,
    handleCollapseAll,
    handleGroupToggle,
    handleSave,
    resetSelection,
  } = useAddBudgetModal(projectId, existingCostCodeIds);

  const handleCancel = () => {
    resetSelection();
    onOpenChange(false);
  };

  const handleSaveAndClose = () => {
    handleSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Budget</DialogTitle>
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
                onCostCodeToggle={handleCostCodeToggle}
              />
            ))}
          </div>

          {Object.keys(groupedCostCodes).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              All cost codes have been added to the budget.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveAndClose}
            disabled={selectedCostCodes.size === 0 || createBudgetItems.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
