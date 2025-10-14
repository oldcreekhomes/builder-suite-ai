
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAddBudgetModal } from '@/hooks/useAddBudgetModal';

interface AddBudgetModalProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCostCodeIds: string[];
}

export function AddBudgetModal({ projectId, open, onOpenChange, existingCostCodeIds }: AddBudgetModalProps) {
  const {
    selectedCostCodes,
    groupedCostCodes,
    createBudgetItems,
    handleCostCodeToggle,
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
        
        <div className="flex-1 overflow-auto px-4 py-2">
          {groupedCostCodes.all && groupedCostCodes.all.length > 0 ? (
            <div className="space-y-1">
              {groupedCostCodes.all.map((costCode) => {
                const indentLevel = !costCode.parent_group ? 0 : 
                  !groupedCostCodes.all.find(cc => cc.code === costCode.parent_group)?.parent_group ? 1 : 2;
                
                const indent = indentLevel * 24; // 24px per level
                
                return (
                  <div 
                    key={costCode.id} 
                    className="flex items-center space-x-3 py-1"
                    style={{ paddingLeft: `${indent}px` }}
                  >
                    <input
                      type="checkbox"
                      id={costCode.id}
                      checked={selectedCostCodes.has(costCode.id)}
                      onChange={(e) => handleCostCodeToggle(costCode.id, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label
                      htmlFor={costCode.id}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {costCode.code}: {costCode.name}
                    </label>
                  </div>
                );
              })}
            </div>
          ) : (
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
