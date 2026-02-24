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
  extracted_data?: { vendor_id?: string; vendorId?: string };
  lines?: PendingBillLine[];
}

export interface POStatusResult {
  status: POStatus;
  poIds: string[];
}

/**
 * Hook that determines PO status for pending/extracted bills by checking
 * explicit purchase_order_id on pending_bill_lines.
 * No inference or auto-matching -- only persisted links count.
 *
 * Returns a Map of bill_id -> POStatusResult (status + matched PO IDs)
 */
export function usePendingBillPOStatus(
  bills: PendingBillForStatus[],
  projectId: string | undefined
) {
  return useQuery({
    queryKey: ['pending-bill-po-status', projectId, bills.map(b => b.id).sort().join(',')],
    queryFn: async () => {
      const resultMap = new Map<string, POStatusResult>();

      bills.forEach(bill => {
        const lines = bill.lines || [];
        if (lines.length === 0) {
          resultMap.set(bill.id, { status: 'no_po', poIds: [] });
          return;
        }

        const explicitPoIds = [...new Set(
          lines.map(l => l.purchase_order_id).filter(Boolean)
        )] as string[];

        const hasAllLinked = lines.every(l => l.purchase_order_id);
        const hasSomeLinked = lines.some(l => l.purchase_order_id);

        if (hasAllLinked) {
          resultMap.set(bill.id, { status: 'matched', poIds: explicitPoIds });
        } else if (hasSomeLinked) {
          resultMap.set(bill.id, { status: 'partial', poIds: explicitPoIds });
        } else {
          resultMap.set(bill.id, { status: 'no_po', poIds: [] });
        }
      });

      return resultMap;
    },
    enabled: !!projectId && bills.length > 0,
    staleTime: 30000,
  });
}
