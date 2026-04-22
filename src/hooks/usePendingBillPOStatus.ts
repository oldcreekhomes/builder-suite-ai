import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { POStatus } from "@/components/bills/POStatusBadge";

interface PendingBillLine {
  cost_code_id?: string;
  purchase_order_id?: string;
  po_assignment?: string | null;
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
 * Hook that determines PO status for pending/extracted bills.
 * First checks explicit purchase_order_id on pending_bill_lines,
 * then falls back to matching by vendor + project + cost_code.
 */
export function usePendingBillPOStatus(
  bills: PendingBillForStatus[],
  projectId: string | undefined
) {
  return useQuery({
    queryKey: ['pending-bill-po-status', projectId, bills.map(b => b.id).sort().join(',')],
    queryFn: async () => {
      const resultMap = new Map<string, POStatusResult>();

      // Collect unmatched cost_code + vendor pairs for fallback
      const fallbackNeeded: Array<{ billId: string; vendorId: string; costCodeId: string }> = [];

      bills.forEach(bill => {
        const lines = bill.lines || [];
        if (lines.length === 0) {
          resultMap.set(bill.id, { status: 'no_po', poIds: [] });
          return;
        }

        const explicitPoIds = [...new Set(
          lines.map(l => l.purchase_order_id).filter(Boolean)
        )] as string[];

        // A line is "resolved" if it has an explicit PO OR the user explicitly chose "No PO".
        const isResolved = (l: PendingBillLine) =>
          !!l.purchase_order_id || l.po_assignment === 'none';
        const hasAllLinked = lines.every(isResolved);
        const hasSomeLinked = lines.some(l => !!l.purchase_order_id);

        if (hasAllLinked) {
          resultMap.set(bill.id, {
            status: explicitPoIds.length > 0 ? 'matched' : 'no_po',
            poIds: explicitPoIds,
          });
        } else if (hasSomeLinked) {
          resultMap.set(bill.id, { status: 'partial', poIds: explicitPoIds });
        } else {
          // Needs fallback matching — but skip lines the user marked "No PO".
          const vendorId = bill.vendor_id || bill.extracted_data?.vendor_id || bill.extracted_data?.vendorId;
          if (vendorId && projectId) {
            lines.forEach(line => {
              if (!line.purchase_order_id && line.po_assignment !== 'none' && line.cost_code_id) {
                fallbackNeeded.push({ billId: bill.id, vendorId, costCodeId: line.cost_code_id });
              }
            });
          }
          if (!fallbackNeeded.some(f => f.billId === bill.id)) {
            resultMap.set(bill.id, { status: 'no_po', poIds: [] });
          }
        }
      });

      // Perform fallback: query POs by vendor + project + cost_code
      if (fallbackNeeded.length > 0 && projectId) {
        const vendorIds = [...new Set(fallbackNeeded.map(f => f.vendorId))];
        const costCodeIds = [...new Set(fallbackNeeded.map(f => f.costCodeId))];

        const { data: fallbackPos } = await supabase
          .from('project_purchase_orders')
          .select('id, company_id, cost_code_id')
          .eq('project_id', projectId)
          .in('company_id', vendorIds)
          .in('cost_code_id', costCodeIds);

        const poLookup = fallbackPos || [];

        // Group fallback items by bill
        const billFallbacks = new Map<string, typeof fallbackNeeded>();
        fallbackNeeded.forEach(f => {
          if (!billFallbacks.has(f.billId)) billFallbacks.set(f.billId, []);
          billFallbacks.get(f.billId)!.push(f);
        });

        billFallbacks.forEach((items, billId) => {
          const matchedPoIds: string[] = [];
          const bill = bills.find(b => b.id === billId);
          const totalLines = bill?.lines?.length || 0;

          items.forEach(item => {
            const match = poLookup.find(
              po => po.company_id === item.vendorId && po.cost_code_id === item.costCodeId
            );
            if (match) matchedPoIds.push(match.id);
          });

          if (matchedPoIds.length > 0 && matchedPoIds.length >= totalLines) {
            resultMap.set(billId, { status: 'matched', poIds: [...new Set(matchedPoIds)] });
          } else if (matchedPoIds.length > 0) {
            resultMap.set(billId, { status: 'partial', poIds: [...new Set(matchedPoIds)] });
          } else {
            resultMap.set(billId, { status: 'no_po', poIds: [] });
          }
        });
      }

      return resultMap;
    },
    enabled: !!projectId && bills.length > 0,
    staleTime: 30000,
  });
}
