import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface AddBudgetModalProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCostCodeIds: string[];
}

export function AddBudgetModal({ projectId, open, onOpenChange, existingCostCodeIds }: AddBudgetModalProps) {
  const [selectedCostCodes, setSelectedCostCodes] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch cost codes
  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('*')
        .order('code');
      
      if (error) throw error;
      return data as CostCode[];
    },
  });

  // Create budget items mutation
  const createBudgetItems = useMutation({
    mutationFn: async (costCodeIds: string[]) => {
      // Get the selected cost codes with their default values
      const selectedCostCodesData = costCodes.filter(cc => costCodeIds.includes(cc.id));
      
      const budgetItems = selectedCostCodesData.map(costCode => ({
        project_id: projectId,
        cost_code_id: costCode.id,
        quantity: costCode.quantity ? parseFloat(costCode.quantity) : 0,
        unit_price: costCode.price ? parseFloat(costCode.price.toString()) : 0,
      }));

      const { data, error } = await supabase
        .from('project_budgets')
        .insert(budgetItems)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
      toast({
        title: "Success",
        description: `Added ${data?.length || 0} budget items successfully`,
      });
      setSelectedCostCodes(new Set());
      onOpenChange(false);
    },
  });

  // Group cost codes by parent group, excluding uncategorized and existing cost codes
  const groupedCostCodes = costCodes.reduce((acc, costCode) => {
    // Skip cost codes that are already in the budget
    if (existingCostCodeIds.includes(costCode.id)) {
      return acc;
    }

    // Skip uncategorized items
    const group = costCode.parent_group;
    if (!group || group.toLowerCase() === 'uncategorized') {
      return acc;
    }

    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(costCode);
    return acc;
  }, {} as Record<string, CostCode[]>);

  const handleCostCodeToggle = (costCodeId: string, checked: boolean) => {
    const newSelected = new Set(selectedCostCodes);
    if (checked) {
      newSelected.add(costCodeId);
    } else {
      newSelected.delete(costCodeId);
    }
    setSelectedCostCodes(newSelected);
  };

  const handleGroupCheckboxChange = (group: string, checked: boolean) => {
    const groupCostCodes = groupedCostCodes[group] || [];
    const newSelected = new Set(selectedCostCodes);
    
    if (checked) {
      // Select all items in this group
      groupCostCodes.forEach(costCode => newSelected.add(costCode.id));
    } else {
      // Deselect all items in this group
      groupCostCodes.forEach(costCode => newSelected.delete(costCode.id));
    }
    
    setSelectedCostCodes(newSelected);
  };

  const isGroupSelected = (group: string) => {
    const groupCostCodes = groupedCostCodes[group] || [];
    return groupCostCodes.length > 0 && groupCostCodes.every(costCode => selectedCostCodes.has(costCode.id));
  };

  const isGroupPartiallySelected = (group: string) => {
    const groupCostCodes = groupedCostCodes[group] || [];
    const selectedInGroup = groupCostCodes.filter(costCode => selectedCostCodes.has(costCode.id));
    return selectedInGroup.length > 0 && selectedInGroup.length < groupCostCodes.length;
  };

  const handleExpandAll = () => {
    setExpandedGroups(new Set(Object.keys(groupedCostCodes)));
  };

  const handleCollapseAll = () => {
    setExpandedGroups(new Set());
  };

  const handleGroupToggle = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const handleSave = () => {
    if (selectedCostCodes.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one cost code to add to the budget.",
        variant: "destructive",
      });
      return;
    }
    createBudgetItems.mutate(Array.from(selectedCostCodes));
  };

  const handleCancel = () => {
    setSelectedCostCodes(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Budget</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          <div className="space-y-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExpandAll}
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCollapseAll}
              className="ml-2"
            >
              Collapse All
            </Button>
          </div>

          <div className="space-y-2">
            {Object.entries(groupedCostCodes).map(([group, codes]) => (
              <Collapsible 
                key={group} 
                open={expandedGroups.has(group)}
                onOpenChange={() => handleGroupToggle(group)}
              >
                <CollapsibleTrigger className="flex items-center w-full p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={isGroupSelected(group)}
                      ref={(el) => {
                        if (el && 'indeterminate' in el) {
                          (el as any).indeterminate = isGroupPartiallySelected(group) && !isGroupSelected(group);
                        }
                      }}
                      onCheckedChange={(checked) => handleGroupCheckboxChange(group, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedGroups.has(group) ? 'rotate-0' : '-rotate-90'}`} />
                    <span className="font-medium text-left">{group}</span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 pl-6 pt-2">
                    {codes.map((costCode) => (
                      <div key={costCode.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={costCode.id}
                          checked={selectedCostCodes.has(costCode.id)}
                          onCheckedChange={(checked) => 
                            handleCostCodeToggle(costCode.id, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={costCode.id}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {costCode.code} - {costCode.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
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
            onClick={handleSave}
            disabled={selectedCostCodes.size === 0 || createBudgetItems.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
