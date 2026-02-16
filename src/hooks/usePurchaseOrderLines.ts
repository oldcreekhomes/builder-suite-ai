import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PurchaseOrderLine {
  id: string;
  purchase_order_id: string;
  cost_code_id: string | null;
  description: string | null;
  quantity: number;
  unit_cost: number;
  amount: number;
  line_number: number;
  extra: boolean;
  created_at: string;
  updated_at: string;
  cost_codes?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface LineItemInput {
  cost_code_id: string | null;
  cost_code_display?: string;
  description: string;
  quantity: number;
  unit_cost: number;
  amount: number;
  extra: boolean;
}

export const usePurchaseOrderLines = (purchaseOrderId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['purchase-order-lines', purchaseOrderId],
    queryFn: async () => {
      if (!purchaseOrderId) return [];

      const { data, error } = await supabase
        .from('purchase_order_lines')
        .select('*')
        .eq('purchase_order_id', purchaseOrderId)
        .order('line_number', { ascending: true });

      if (error) throw error;

      // Fetch cost codes for lines
      const costCodeIds = [...new Set((data || []).map(l => l.cost_code_id).filter(Boolean))];
      let costCodeMap = new Map();
      if (costCodeIds.length > 0) {
        const { data: costCodes } = await supabase
          .from('cost_codes')
          .select('id, code, name')
          .in('id', costCodeIds);
        costCodeMap = new Map(costCodes?.map(cc => [cc.id, cc]) || []);
      }

      return (data || []).map(line => ({
        ...line,
        cost_codes: costCodeMap.get(line.cost_code_id) || undefined,
      })) as PurchaseOrderLine[];
    },
    enabled: !!purchaseOrderId,
  });

  const saveLinesForPO = useMutation({
    mutationFn: async ({ poId, lines: lineItems }: { poId: string; lines: LineItemInput[] }) => {
      // Delete existing lines
      await supabase
        .from('purchase_order_lines')
        .delete()
        .eq('purchase_order_id', poId);

      if (lineItems.length === 0) return;

      // Insert new lines
      const rows = lineItems.map((line, idx) => ({
        purchase_order_id: poId,
        cost_code_id: line.cost_code_id,
        description: line.description || null,
        quantity: line.quantity,
        unit_cost: line.unit_cost,
        amount: line.amount,
        line_number: idx + 1,
        extra: line.extra,
      }));

      const { error } = await supabase
        .from('purchase_order_lines')
        .insert(rows);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order-lines'] });
    },
    onError: (error) => {
      console.error('Error saving PO lines:', error);
      toast({
        title: 'Error',
        description: 'Failed to save purchase order lines',
        variant: 'destructive',
      });
    },
  });

  return { lines, isLoading, saveLinesForPO };
};
