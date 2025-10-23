import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useAddBudgetModal } from '@/hooks/useAddBudgetModal';

interface FromCostCodesTabProps {
  projectId: string;
  existingCostCodeIds: string[];
  selectedCostCodes: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
}

export function FromCostCodesTab({ 
  projectId, 
  existingCostCodeIds,
  selectedCostCodes,
  onSelectionChange 
}: FromCostCodesTabProps) {
  const {
    groupedCostCodes,
    expandedGroups,
    costCodes,
    handleCostCodeToggle,
    handleGroupToggle,
  } = useAddBudgetModal(projectId, existingCostCodeIds);

  const handleToggle = (id: string, checked: boolean) => {
    const newSelection = new Set(selectedCostCodes);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    onSelectionChange(newSelection);
    handleCostCodeToggle(id, checked);
  };

  return (
    <div className="space-y-2 max-h-[400px] overflow-auto">
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
                    onChange={(e) => handleToggle(parent.id, e.target.checked)}
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
                          onChange={(e) => handleToggle(child.id, e.target.checked)}
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
  );
}
