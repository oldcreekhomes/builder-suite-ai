import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export interface PurchaseOrder {
  id: string;
  project_id: string;
  company_id: string;
  cost_code_id: string;
  extra: boolean;
  status: string;
  total_amount: number;
  notes?: string;
  files: any[];
  created_at: string;
  updated_at: string;
  created_by: string;
  companies?: {
    company_name: string;
  };
  cost_codes?: {
    code: string;
    name: string;
  };
}

export const usePurchaseOrders = (projectId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: purchaseOrders, isLoading, error } = useQuery({
    queryKey: ['purchase-orders', projectId],
    queryFn: async () => {
      if (!user || !projectId) return [];

      // Fetch purchase orders
      const { data: poData, error: poError } = await supabase
        .from('project_purchase_orders')
        .select('*')
        .eq('project_id', projectId);

      if (poError) {
        console.error('Error fetching purchase orders:', poError);
        throw poError;
      }

      if (!poData || poData.length === 0) {
        return [];
      }

      // Get unique company and cost code IDs
      const companyIds = [...new Set(poData.map(po => po.company_id))];
      const costCodeIds = [...new Set(poData.map(po => po.cost_code_id))];

      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, company_name')
        .in('id', companyIds);

      if (companiesError) {
        console.error('Error fetching companies:', companiesError);
        throw companiesError;
      }

      // Fetch cost codes
      const { data: costCodesData, error: costCodesError } = await supabase
        .from('cost_codes')
        .select('id, code, name')
        .in('id', costCodeIds);

      if (costCodesError) {
        console.error('Error fetching cost codes:', costCodesError);
        throw costCodesError;
      }

      // Create lookup maps
      const companiesMap = new Map(companiesData?.map(c => [c.id, c]) || []);
      const costCodesMap = new Map(costCodesData?.map(cc => [cc.id, cc]) || []);

      // Merge data
      const mergedData = poData.map(po => ({
        ...po,
        companies: companiesMap.get(po.company_id),
        cost_codes: costCodesMap.get(po.cost_code_id)
      }));

      // Sort by cost code numerically
      const sortedData = mergedData.sort((a, b) => {
        const codeA = a.cost_codes?.code || '';
        const codeB = b.cost_codes?.code || '';
        
        // Extract numeric part from cost code for sorting
        const numA = parseInt(codeA.replace(/\D/g, '')) || 0;
        const numB = parseInt(codeB.replace(/\D/g, '')) || 0;
        
        return numA - numB;
      });

      return sortedData;
    },
    enabled: !!user && !!projectId,
  });

  const createPurchaseOrderMutation = useMutation({
    mutationFn: async (newPO: {
      project_id: string;
      company_id: string;
      cost_code_id: string;
      extra: boolean;
      notes?: string;
      files: any[];
    }) => {
      const { data, error } = await supabase
        .from('project_purchase_orders')
        .insert([newPO])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive",
      });
    },
  });

  const updatePurchaseOrderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PurchaseOrder> }) => {
      const { data, error } = await supabase
        .from('project_purchase_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
      toast({
        title: "Success",
        description: "Purchase order updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to update purchase order",
        variant: "destructive",
      });
    },
  });

  return {
    purchaseOrders: purchaseOrders || [],
    isLoading,
    error,
    createPurchaseOrder: createPurchaseOrderMutation.mutate,
    updatePurchaseOrder: updatePurchaseOrderMutation.mutate,
    isCreating: createPurchaseOrderMutation.isPending,
    isUpdating: updatePurchaseOrderMutation.isPending,
  };
};