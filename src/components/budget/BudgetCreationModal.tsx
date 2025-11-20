import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FromCostCodesTab } from './creation/FromCostCodesTab';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BudgetCreationModalProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCostCodeIds: string[];
  selectedLotId: string | null;
}

export function BudgetCreationModal({ 
  projectId, 
  open, 
  onOpenChange, 
  existingCostCodeIds,
  selectedLotId 
}: BudgetCreationModalProps) {
  const [selectedCostCodes, setSelectedCostCodes] = useState<Set<string>>(new Set());
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      if (selectedCostCodes.size === 0) {
        throw new Error('No items to create');
      }

      const itemsToCreate = Array.from(selectedCostCodes).map(costCodeId => ({
        project_id: projectId,
        cost_code_id: costCodeId,
        quantity: 0,
        unit_price: 0,
        lot_id: selectedLotId,
      }));

      const { error } = await supabase
        .from('project_budgets')
        .insert(itemsToCreate);

      if (error) throw error;

      return itemsToCreate.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
      toast({
        title: "Budget items created",
        description: `Successfully added ${count} items to the budget`,
      });
      handleClose();
    },
    onError: (error) => {
      console.error('Error creating budget items:', error);
      toast({
        title: "Error",
        description: "Failed to create budget items",
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    setSelectedCostCodes(new Set());
    onOpenChange(false);
  };

  const handleSave = () => {
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Cost Codes</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4">
          <FromCostCodesTab
            projectId={projectId}
            existingCostCodeIds={existingCostCodeIds}
            selectedCostCodes={selectedCostCodes}
            onSelectionChange={setSelectedCostCodes}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={selectedCostCodes.size === 0 || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Budget Items'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
