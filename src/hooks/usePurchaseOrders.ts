import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Enhanced Purchase Order interface with related data
export interface PurchaseOrder {
  id: string;
  project_id: string;
  company_id: string;
  cost_code_id: string;
  total_amount: number | null;
  status: string;
  notes: string | null;
  po_number?: string;
  files: any;
  created_at: string;
  created_by: string;
  updated_at: string;
  extra: boolean;
  companies?: {
    id: string;
    company_name: string;
  };
  cost_codes?: {
    id: string;
    code: string;
    name: string;
    parent_group: string | null;
    category: string | null;
  };
}

export const usePurchaseOrders = (projectId: string, lotId?: string | null) => {
  const [groupedPurchaseOrders, setGroupedPurchaseOrders] = useState<Record<string, PurchaseOrder[]>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch purchase orders with related data
  const {
    data: purchaseOrders = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['purchase-orders', projectId, lotId],
    queryFn: async () => {
      console.log('Fetching purchase orders for project:', projectId, 'lot:', lotId);
      
      // Fetch purchase orders
      let query = supabase
        .from('project_purchase_orders')
        .select('*, po_number')
        .eq('project_id', projectId);
      
      // Filter by lot_id if provided
      if (lotId) {
        query = query.eq('lot_id', lotId);
      }
      
      const { data: pos, error: posError } = await query.order('updated_at', { ascending: false });

      if (posError) {
        console.error('Error fetching purchase orders:', posError);
        throw posError;
      }

      if (!pos || pos.length === 0) {
        return [];
      }

      // Get unique company and cost code IDs
      const companyIds = [...new Set(pos.map(po => po.company_id))];
      const costCodeIds = [...new Set(pos.map(po => po.cost_code_id))];

      // Fetch companies
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, company_name')
        .in('id', companyIds);

      if (companiesError) {
        console.error('Error fetching companies:', companiesError);
        throw companiesError;
      }

      // Fetch cost codes
      const { data: costCodes, error: costCodesError } = await supabase
        .from('cost_codes')
        .select('id, code, name, parent_group, category')
        .in('id', costCodeIds);

      if (costCodesError) {
        console.error('Error fetching cost codes:', costCodesError);
        throw costCodesError;
      }

      // Create lookup maps
      const companyMap = new Map(companies?.map(c => [c.id, c]) || []);
      const costCodeMap = new Map(costCodes?.map(cc => [cc.id, cc]) || []);

      // Merge data and return as PurchaseOrder objects
      const enrichedPOs: PurchaseOrder[] = pos.map(po => ({
        ...po,
        companies: companyMap.get(po.company_id),
        cost_codes: costCodeMap.get(po.cost_code_id)
      }));

      // Sort by cost code numerically
      enrichedPOs.sort((a, b) => {
        const aCode = parseInt(a.cost_codes?.code || '0');
        const bCode = parseInt(b.cost_codes?.code || '0');
        return aCode - bCode;
      });

      console.log('Fetched and processed purchase orders:', enrichedPOs.length);
      return enrichedPOs;
    },
    enabled: !!projectId,
  });

  // Group purchase orders by cost code parent group
  useEffect(() => {
    const groups: Record<string, PurchaseOrder[]> = {};
    
    purchaseOrders.forEach(po => {
      const costCode = po.cost_codes;
      const groupKey = costCode?.parent_group || costCode?.category || 'Ungrouped';
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(po);
    });

    // Sort each group by cost code
    Object.keys(groups).forEach(groupKey => {
      groups[groupKey].sort((a, b) => {
        const aCode = parseInt(a.cost_codes?.code || '0');
        const bCode = parseInt(b.cost_codes?.code || '0');
        return aCode - bCode;
      });
    });

    setGroupedPurchaseOrders(groups);
  }, [purchaseOrders]);

  // Delete purchase order mutation
  const deletePurchaseOrder = useMutation({
    mutationFn: async (poId: string) => {
      const { error } = await supabase
        .from('project_purchase_orders')
        .delete()
        .eq('id', poId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
      toast({
        title: "Success",
        description: "Purchase order deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to delete purchase order",
        variant: "destructive",
      });
    },
  });

  // Delete purchase order group mutation
  const deletePurchaseOrderGroup = useMutation({
    mutationFn: async (poIds: string[]) => {
      const { error } = await supabase
        .from('project_purchase_orders')
        .delete()
        .in('id', poIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
      toast({
        title: "Success",
        description: "Purchase order group deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting purchase order group:', error);
      toast({
        title: "Error",
        description: "Failed to delete purchase order group",
        variant: "destructive",
      });
    },
  });

  // Create purchase order mutation
  const createPurchaseOrder = useMutation({
    mutationFn: async (purchaseOrderData: {
      project_id: string;
      company_id: string;
      cost_code_id: string;
      total_amount?: number;
      status?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('project_purchase_orders')
        .insert([purchaseOrderData])
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

  // Update purchase order mutation
  const updatePurchaseOrder = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
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
    purchaseOrders,
    groupedPurchaseOrders,
    isLoading,
    error,
    refetch,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    deletePurchaseOrderGroup,
    isCreating: createPurchaseOrder.isPending,
    isUpdating: updatePurchaseOrder.isPending,
    isDeleting: deletePurchaseOrder.isPending,
  };
};