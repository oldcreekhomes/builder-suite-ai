import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAddBudgetModal } from '@/hooks/useAddBudgetModal';

interface LumpSumTabProps {
  projectId: string;
  existingCostCodeIds: string[];
  lumpSumAmounts: Map<string, number>;
  onAmountsChange: (amounts: Map<string, number>) => void;
}

export function LumpSumTab({ 
  projectId, 
  existingCostCodeIds,
  lumpSumAmounts,
  onAmountsChange
}: LumpSumTabProps) {
  const {
    groupedCostCodes,
    expandedGroups,
    costCodes,
    handleGroupToggle,
  } = useAddBudgetModal(projectId, existingCostCodeIds);

  const handleAmountChange = (costCodeId: string, value: string) => {
    const newAmounts = new Map(lumpSumAmounts);
    const numValue = parseFloat(value);
    
    if (value === '' || isNaN(numValue)) {
      newAmounts.delete(costCodeId);
    } else {
      newAmounts.set(costCodeId, numValue);
    }
    
    onAmountsChange(newAmounts);
  };

  const formatCurrency = (value: number) => {
    return `$${Math.round(value).toLocaleString()}`;
  };

  const calculateTotal = () => {
    return Array.from(lumpSumAmounts.values()).reduce((sum, amount) => sum + amount, 0);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Select cost codes and enter a total lump sum amount for each (no quantity breakdown needed).
      </div>

      <div className="space-y-2 max-h-[350px] overflow-auto">
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
                    <CollapsibleTrigger className="flex items-center space-x-2 flex-1 text-left hover:bg-muted/50 rounded px-2 py-1">
                      <ChevronDown 
                        className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                      />
                      <span className="text-sm font-medium flex-1">
                        {parent.code}: {parent.name}
                      </span>
                    </CollapsibleTrigger>
                    <Input
                      type="number"
                      placeholder="$0"
                      value={lumpSumAmounts.get(parent.id) || ''}
                      onChange={(e) => handleAmountChange(parent.id, e.target.value)}
                      className="w-32 h-8 text-sm"
                    />
                  </div>
                  
                  <CollapsibleContent>
                    <div className="ml-6 space-y-1 mt-1">
                      {children.map((child) => (
                        <div 
                          key={child.id} 
                          className="flex items-center space-x-3 py-1 pl-6"
                        >
                          <span className="text-sm flex-1">
                            {child.code}: {child.name}
                          </span>
                          <Input
                            type="number"
                            placeholder="$0"
                            value={lumpSumAmounts.get(child.id) || ''}
                            onChange={(e) => handleAmountChange(child.id, e.target.value)}
                            className="w-32 h-8 text-sm"
                          />
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

      {lumpSumAmounts.size > 0 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {lumpSumAmounts.size} lump sum entries
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Budget</div>
            <div className="text-lg font-semibold">
              {formatCurrency(calculateTotal())}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
