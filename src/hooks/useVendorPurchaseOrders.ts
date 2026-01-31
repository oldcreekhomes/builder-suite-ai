import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VendorPurchaseOrder {
  id: string;
  po_number: string;
  total_amount: number;
  cost_code_id: string | null;
  cost_code?: {
    id: string;
    code: string;
    name: string;
  };
  total_billed: number;
  remaining: number;
}

/**
 * Hook to fetch approved Purchase Orders for a specific vendor on a specific project.
 * Includes the total amount billed against each PO to show remaining balance.
 */
export function useVendorPurchaseOrders(
  projectId: string | null | undefined,
  vendorId: string | null | undefined
) {
  return useQuery({
    queryKey: ['vendor-pos', projectId, vendorId],
    queryFn: async (): Promise<VendorPurchaseOrder[]> => {
      if (!projectId || !vendorId) return [];

      // Fetch all approved POs for this vendor + project (without embedded join)
      const { data: pos, error: poError } = await supabase
        .from('project_purchase_orders')
        .select(`
          id,
          po_number,
          total_amount,
          cost_code_id
        `)
        .eq('project_id', projectId)
        .eq('company_id', vendorId)
        .eq('status', 'approved');

      if (poError) throw poError;
      if (!pos || pos.length === 0) return [];

      // Collect unique cost_code_ids and fetch cost codes separately
      const costCodeIds = [...new Set(pos.map(po => po.cost_code_id).filter(Boolean))] as string[];
      
      let costCodeMap = new Map<string, { id: string; code: string; name: string }>();
      if (costCodeIds.length > 0) {
        const { data: costCodes } = await supabase
          .from('cost_codes')
          .select('id, code, name')
          .in('id', costCodeIds);
        
        if (costCodes) {
          costCodeMap = new Map(costCodes.map(cc => [cc.id, cc]));
        }
      }

      // Fetch bill lines linked to these POs (by explicit purchase_order_id)
      const poIds = pos.map(po => po.id);

      // Get billed amounts from bill_lines that have explicit purchase_order_id
      const { data: explicitBilled } = await supabase
        .from('bill_lines')
        .select('purchase_order_id, amount')
        .in('purchase_order_id', poIds);

      // Get billed amounts from bill_lines that match by cost_code (for lines without explicit PO)
      const { data: implicitBilledLines } = await supabase
        .from('bills')
        .select(`
          id,
          vendor_id,
          project_id,
          status,
          is_reversal,
          reversed_at,
          bill_lines (
            cost_code_id,
            amount,
            purchase_order_id
          )
        `)
        .eq('project_id', projectId)
        .eq('vendor_id', vendorId)
        .in('status', ['posted', 'paid'])
        .eq('is_reversal', false)
        .is('reversed_at', null);

      // Calculate total billed per PO
      const billedByPoId = new Map<string, number>();

      // Count explicit links
      (explicitBilled || []).forEach(line => {
        if (line.purchase_order_id) {
          const current = billedByPoId.get(line.purchase_order_id) || 0;
          billedByPoId.set(line.purchase_order_id, current + (line.amount || 0));
        }
      });

      // Count implicit (cost code matching) - only for lines WITHOUT explicit PO
      const billedByCostCode = new Map<string, number>();
      (implicitBilledLines || []).forEach(bill => {
        (bill.bill_lines || []).forEach(line => {
          if (!line.purchase_order_id && line.cost_code_id) {
            const current = billedByCostCode.get(line.cost_code_id) || 0;
            billedByCostCode.set(line.cost_code_id, current + (line.amount || 0));
          }
        });
      });

      // Build result with remaining balances
      return pos.map(po => {
        // Look up cost code from the map
        const costCodeData = po.cost_code_id ? costCodeMap.get(po.cost_code_id) : null;
        
        // Total billed = explicit PO links + implicit cost code matching
        let totalBilled = billedByPoId.get(po.id) || 0;
        if (po.cost_code_id && !billedByPoId.has(po.id)) {
          // Add cost code based billing only if no explicit links exist
          totalBilled += billedByCostCode.get(po.cost_code_id) || 0;
        }

        return {
          id: po.id,
          po_number: po.po_number || 'Unknown',
          total_amount: po.total_amount || 0,
          cost_code_id: po.cost_code_id,
          cost_code: costCodeData || undefined,
          total_billed: totalBilled,
          remaining: (po.total_amount || 0) - totalBilled,
        };
      });
    },
    enabled: !!projectId && !!vendorId,
    staleTime: 30000, // Cache for 30 seconds
  });
}
