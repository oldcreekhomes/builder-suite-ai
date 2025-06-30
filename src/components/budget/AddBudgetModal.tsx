
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
      const budgetItems = costCodeIds.map(costCodeId => ({
        project_id: projectId,
        cost_code_id: costCodeId,
        quantity: 0,
        unit_price: 0,
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

  // Group cost codes by parent group
  const groupedCostCodes = costCodes.reduce((acc, costCode) => {
    // Skip cost codes that are already in the budget
    if (existingCostCodeIds.includes(costCode.id)) {
      return acc;
    }

    const group = costCode.parent_group || 'Uncategorized';
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
              onClick={() => {
                const allAvailableIds = Object.values(groupedCostCodes)
                  .flat()
                  .map(cc => cc.id);
                setSelectedCostCodes(new Set(allAvailableIds));
              }}
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCostCodes(new Set())}
              className="ml-2"
            >
              Collapse All
            </Button>
          </div>

          <Accordion type="multiple" className="w-full">
            {Object.entries(groupedCostCodes).map(([group, codes]) => (
              <AccordionItem key={group} value={group}>
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <span>{group}</span>
                    <span className="text-sm text-gray-500">({codes.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pl-4">
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
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

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
