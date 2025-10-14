
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
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
    expandedGroups,
    costCodes,
    createBudgetItems,
    handleCostCodeToggle,
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
        
        <div className="flex-1 overflow-auto px-4 py-2">
          {Object.keys(groupedCostCodes).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(groupedCostCodes).map(([parentCode, children]) => {
                const parent = costCodes.find(cc => cc.code === parentCode);
                if (!parent) return null;
                
                const isExpanded = expandedGroups.has(parentCode);
                
                return (
                  <Collapsible
                    key={parentCode}
                    open={isExpanded}
                    onOpenChange={() => handleGroupToggle(parentCode)}
                  >
                    <div className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        id={parent.id}
                        checked={selectedCostCodes.has(parent.id)}
                        onChange={(e) => handleCostCodeToggle(parent.id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <CollapsibleTrigger className="flex items-center space-x-2 flex-1 text-left hover:bg-muted/50 rounded px-2 py-1">
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                        />
                        <label
                          htmlFor={parent.id}
                          className="text-sm font-medium cursor-pointer flex-1"
                        >
                          {parent.code}: {parent.name}
                        </label>
                      </CollapsibleTrigger>
                    </div>
                    
                    <CollapsibleContent>
                      <div className="ml-6 space-y-1 mt-1">
                        {children.map((child) => (
                          <div 
                            key={child.id} 
                            className="flex items-center space-x-3 py-1 pl-6"
                          >
                            <input
                              type="checkbox"
                              id={child.id}
                              checked={selectedCostCodes.has(child.id)}
                              onChange={(e) => handleCostCodeToggle(child.id, e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <label
                              htmlFor={child.id}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {child.code}: {child.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
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
