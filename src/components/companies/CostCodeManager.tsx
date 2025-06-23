
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormLabel } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CostCodeManagerProps {
  companyId: string;
}

export function CostCodeManager({ companyId }: CostCodeManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [costCodeSearch, setCostCodeSearch] = useState("");

  // Fetch all cost codes
  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('id, code, name')
        .order('code');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch company's current cost codes - this will be our source of truth
  const { data: companyCostCodes = [] } = useQuery({
    queryKey: ['company-cost-codes', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_cost_codes')
        .select('cost_code_id')
        .eq('company_id', companyId);
      
      if (error) throw error;
      return data.map(item => item.cost_code_id);
    },
    enabled: !!companyId,
  });

  // Save cost code associations
  const saveCostCodesMutation = useMutation({
    mutationFn: async (costCodeIds: string[]) => {
      console.log('Saving cost codes for company:', companyId, costCodeIds);
      
      // First, remove all existing associations
      const { error: deleteError } = await supabase
        .from('company_cost_codes')
        .delete()
        .eq('company_id', companyId);

      if (deleteError) throw deleteError;

      // Then add the new associations
      if (costCodeIds.length > 0) {
        const costCodeAssociations = costCodeIds.map(costCodeId => ({
          company_id: companyId,
          cost_code_id: costCodeId,
        }));

        const { error: insertError } = await supabase
          .from('company_cost_codes')
          .insert(costCodeAssociations);

        if (insertError) throw insertError;
      }

      return costCodeIds;
    },
    onSuccess: () => {
      // Invalidate and refetch the company cost codes
      queryClient.invalidateQueries({ queryKey: ['company-cost-codes', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      
      toast({
        title: "Success",
        description: "Cost code associations updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating cost codes:', error);
      toast({
        title: "Error",
        description: "Failed to update cost code associations",
        variant: "destructive",
      });
    },
  });

  // Filter cost codes based on search
  const filteredCostCodes = costCodes.filter(costCode => 
    costCode.code.toLowerCase().includes(costCodeSearch.toLowerCase()) ||
    costCode.name.toLowerCase().includes(costCodeSearch.toLowerCase())
  );

  const handleCostCodeToggle = (costCodeId: string, checked: boolean) => {
    const newSelection = checked
      ? [...companyCostCodes, costCodeId]
      : companyCostCodes.filter(id => id !== costCodeId);
    
    console.log('Toggling cost code:', costCodeId, 'Checked:', checked, 'New selection:', newSelection);
    saveCostCodesMutation.mutate(newSelection);
  };

  const removeCostCode = (costCodeId: string) => {
    const newSelection = companyCostCodes.filter(id => id !== costCodeId);
    console.log('Removing cost code:', costCodeId, 'New selection:', newSelection);
    saveCostCodesMutation.mutate(newSelection);
  };

  return (
    <div className="space-y-4">
      <FormLabel>Associated Cost Codes</FormLabel>
      
      {/* Selected cost codes */}
      {companyCostCodes.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md">
          {companyCostCodes.map(costCodeId => {
            const costCode = costCodes.find(cc => cc.id === costCodeId);
            return costCode ? (
              <Badge key={costCodeId} variant="secondary" className="flex items-center gap-1 text-xs">
                {costCode.code} - {costCode.name}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-red-500" 
                  onClick={() => removeCostCode(costCodeId)}
                />
              </Badge>
            ) : null;
          })}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search cost codes by number or name..."
          value={costCodeSearch}
          onChange={(e) => setCostCodeSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Cost code selection */}
      <div className="max-h-24 overflow-y-auto border rounded-md">
        {filteredCostCodes.length === 0 ? (
          <div className="p-2 text-gray-500 text-center text-xs">
            {costCodeSearch ? 'No cost codes found matching your search' : 'No cost codes available'}
          </div>
        ) : (
          filteredCostCodes.map((costCode) => (
            <div
              key={costCode.id}
              className="p-2 border-b hover:bg-gray-50"
            >
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={companyCostCodes.includes(costCode.id)}
                  onCheckedChange={(checked) => handleCostCodeToggle(costCode.id, checked === true)}
                />
                <div className="text-xs">
                  <span className="font-medium">{costCode.code}</span> - {costCode.name}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {saveCostCodesMutation.isPending && (
        <div className="text-xs text-gray-500">Saving changes...</div>
      )}
    </div>
  );
}
