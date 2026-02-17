import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { POStatus } from "@/components/bills/POStatusBadge";

interface PendingBillLine {
  cost_code_id?: string;
  purchase_order_id?: string;
}

interface PendingBillForStatus {
  id: string;
  vendor_id?: string;
  lines?: PendingBillLine[];
}

/**
 * Hook that determines PO status for pending/extracted bills by checking:
 * 1. Explicit purchase_order_id on pending_bill_lines (set via Edit dialog)
 * 2. Auto-match against project_purchase_orders using vendor + project + cost_code
 *
 * Returns a Map of bill_id -> POStatus
 */
export function usePendingBillPOStatus(
  bills: PendingBillForStatus[],
  projectId: string | undefined
) {
  // Collect unique vendor+cost_code combos for the query
  const vendorIds = [...new Set(bills.map(b => b.vendor_id).filter(Boolean))] as string[];
  const costCodeIds = [...new Set(
    bills.flatMap(b => b.lines?.map(l => l.cost_code_id).filter(Boolean) || [])
  )] as string[];

  return useQuery({
    queryKey: ['pending-bill-po-status', projectId, vendorIds.sort().join(','), costCodeIds.sort().join(',')],
    queryFn: async () => {
      if (!projectId || !vendorIds.length || !costCodeIds.length) {
        return new Map<string, POStatus>();
      }

      // Fetch POs matching vendor + project + cost_code
      const { data: pos, error } = await supabase
        .from('project_purchase_orders')
        .select('id, company_id, cost_code_id')
        .eq('project_id', projectId)
        .in('company_id', vendorIds)
        .in('cost_code_id', costCodeIds);

      if (error) throw error;

      // Build a Set of "vendor_id|cost_code_id" keys that have a PO
      const poKeys = new Set(
        (pos || []).map(po => `${po.company_id}|${po.cost_code_id}`)
      );

      // Now determine status for each bill
      const resultMap = new Map<string, POStatus>();

      bills.forEach(bill => {
        const lines = bill.lines || [];
        if (lines.length === 0) {
          resultMap.set(bill.id, 'no_po');
          return;
        }

        // Check explicit links first
        const hasExplicitAll = lines.every(l => l.purchase_order_id);
        const hasExplicitAny = lines.some(l => l.purchase_order_id);

        if (hasExplicitAll) {
          resultMap.set(bill.id, 'matched');
          return;
        }
        if (hasExplicitAny) {
          resultMap.set(bill.id, 'partial');
          return;
        }

        // Auto-match: check if cost codes have matching POs for this vendor
        if (!bill.vendor_id) {
          resultMap.set(bill.id, 'no_po');
          return;
        }

        const linesWithCostCode = lines.filter(l => l.cost_code_id);
        if (linesWithCostCode.length === 0) {
          resultMap.set(bill.id, 'no_po');
          return;
        }

        const matchedCount = linesWithCostCode.filter(l =>
          poKeys.has(`${bill.vendor_id}|${l.cost_code_id}`)
        ).length;

        if (matchedCount === linesWithCostCode.length) {
          resultMap.set(bill.id, 'matched');
        } else if (matchedCount > 0) {
          resultMap.set(bill.id, 'partial');
        } else {
          resultMap.set(bill.id, 'no_po');
        }
      });

      return resultMap;
    },
    enabled: !!projectId && bills.length > 0,
    staleTime: 30000,
  });
}
