import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FromCostCodesTab } from './creation/FromCostCodesTab';
import { FromHistoricalTab } from './creation/FromHistoricalTab';
import { LumpSumTab } from './creation/LumpSumTab';
import { FromBidsTab } from './creation/FromBidsTab';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BudgetCreationModalProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCostCodeIds: string[];
}

export function BudgetCreationModal({ 
  projectId, 
  open, 
  onOpenChange, 
  existingCostCodeIds 
}: BudgetCreationModalProps) {
  const [activeTab, setActiveTab] = useState('cost-codes');
  const [selectedCostCodes, setSelectedCostCodes] = useState<Set<string>>(new Set());
  const [lumpSumAmounts, setLumpSumAmounts] = useState<Map<string, number>>(new Map());
  const [selectedBids, setSelectedBids] = useState<Map<string, string>>(new Map());
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      let itemsToCreate: any[] = [];

      if (activeTab === 'cost-codes' && selectedCostCodes.size > 0) {
        itemsToCreate = Array.from(selectedCostCodes).map(costCodeId => ({
          project_id: projectId,
          cost_code_id: costCodeId,
          quantity: 0,
          unit_price: 0,
        }));
      } else if (activeTab === 'lump-sum' && lumpSumAmounts.size > 0) {
        itemsToCreate = Array.from(lumpSumAmounts.entries()).map(([costCodeId, amount]) => ({
          project_id: projectId,
          cost_code_id: costCodeId,
          quantity: 1,
          unit_price: amount,
        }));
      } else if (activeTab === 'bids' && selectedBids.size > 0) {
        itemsToCreate = Array.from(selectedBids.entries()).map(([costCodeId, bidId]) => ({
          project_id: projectId,
          cost_code_id: costCodeId,
          selected_bid_id: bidId,
          quantity: 0,
          unit_price: 0,
        }));
      }

      if (itemsToCreate.length === 0) {
        throw new Error('No items to create');
      }

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
    setLumpSumAmounts(new Map());
    setSelectedBids(new Map());
    setActiveTab('cost-codes');
    onOpenChange(false);
  };

  const handleSave = () => {
    createMutation.mutate();
  };

  const canSave = () => {
    if (activeTab === 'cost-codes') return selectedCostCodes.size > 0;
    if (activeTab === 'lump-sum') return lumpSumAmounts.size > 0;
    if (activeTab === 'bids') return selectedBids.size > 0;
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Budget Items</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cost-codes">From Cost Codes</TabsTrigger>
            <TabsTrigger value="historical">From Historical</TabsTrigger>
            <TabsTrigger value="lump-sum">Lump Sum</TabsTrigger>
            <TabsTrigger value="bids">From Bids</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="cost-codes" className="mt-0">
              <FromCostCodesTab
                projectId={projectId}
                existingCostCodeIds={existingCostCodeIds}
                selectedCostCodes={selectedCostCodes}
                onSelectionChange={setSelectedCostCodes}
              />
            </TabsContent>

            <TabsContent value="historical" className="mt-0">
              <FromHistoricalTab
                projectId={projectId}
                onImportComplete={handleClose}
              />
            </TabsContent>

            <TabsContent value="lump-sum" className="mt-0">
              <LumpSumTab
                projectId={projectId}
                existingCostCodeIds={existingCostCodeIds}
                lumpSumAmounts={lumpSumAmounts}
                onAmountsChange={setLumpSumAmounts}
              />
            </TabsContent>

            <TabsContent value="bids" className="mt-0">
              <FromBidsTab
                projectId={projectId}
                selectedBids={selectedBids}
                onBidsChange={setSelectedBids}
              />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {activeTab !== 'historical' && (
            <Button 
              onClick={handleSave}
              disabled={!canSave() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Budget Items'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
