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

  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ['purchase-orders', projectId],
    queryFn: async () => {
      if (!user || !projectId) return [];

      const { data, error } = await supabase
        .from('project_purchase_orders')
        .select(`
          *,
          companies(company_name),
          cost_codes(code, name)
        `)
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching purchase orders:', error);
        throw error;
      }

      // Sort by cost code numerically
      const sortedData = (data || []).sort((a, b) => {
        const codeA = (a.cost_codes as any)?.code || '';
        const codeB = (b.cost_codes as any)?.code || '';
        
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
    createPurchaseOrder: createPurchaseOrderMutation.mutate,
    updatePurchaseOrder: updatePurchaseOrderMutation.mutate,
    isCreating: createPurchaseOrderMutation.isPending,
    isUpdating: updatePurchaseOrderMutation.isPending,
  };
};