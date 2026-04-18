import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BilledInvoice {
  bill_id: string;
  reference_number: string;
  bill_date: string;
  amount: number;
}

export interface POLineItem {
  id: string;
  line_number: number;
  description: string | null;
  cost_code_id: string | null;
  cost_code?: {
    id: string;
    code: string;
    name: string;
  };
  quantity: number;
  unit_cost: number;
  amount: number;
  total_billed: number;
  remaining: number;
  billed_invoices: BilledInvoice[];
}

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
  unallocated_billed: number;
  unallocated_invoices: BilledInvoice[];
  line_items: POLineItem[];
}

/**
 * Hook to fetch approved Purchase Orders for a specific vendor on a specific project.
 * Includes line-item level billing breakdown.
 */
export function useVendorPurchaseOrders(
  projectId: string | null | undefined,
  vendorId: string | null | undefined,
  excludeBillId?: string,
  excludeBillDate?: string
) {
  return useQuery({
    queryKey: ['vendor-pos', projectId, vendorId, excludeBillId, excludeBillDate],
    queryFn: async (): Promise<VendorPurchaseOrder[]> => {
      if (!projectId || !vendorId) return [];

      // Fetch all approved POs for this vendor + project
      const { data: pos, error: poError } = await supabase
        .from('project_purchase_orders')
        .select(`id, po_number, total_amount, cost_code_id`)
        .eq('project_id', projectId)
        .eq('company_id', vendorId)
        .eq('status', 'approved');

      if (poError) throw poError;
      if (!pos || pos.length === 0) return [];

      const poIds = pos.map(po => po.id);

      // Fetch PO line items
      const { data: poLines } = await supabase
        .from('purchase_order_lines')
        .select('id, purchase_order_id, line_number, description, cost_code_id, quantity, unit_cost, amount')
        .in('purchase_order_id', poIds)
        .order('line_number', { ascending: true });

      // Collect all cost code IDs from POs and PO lines
      const allCostCodeIds = [
        ...pos.map(po => po.cost_code_id).filter(Boolean),
        ...(poLines || []).map(l => l.cost_code_id).filter(Boolean),
      ] as string[];
      const uniqueCostCodeIds = [...new Set(allCostCodeIds)];

      let costCodeMap = new Map<string, { id: string; code: string; name: string }>();
      if (uniqueCostCodeIds.length > 0) {
        const { data: costCodes } = await supabase
          .from('cost_codes')
          .select('id, code, name')
          .in('id', uniqueCostCodeIds);
        if (costCodes) {
          costCodeMap = new Map(costCodes.map(cc => [cc.id, cc]));
        }
      }

      // Fetch billed amounts per PO line (using purchase_order_line_id)
      const poLineIds = (poLines || []).map(l => l.id);
      let billedByLineId = new Map<string, number>();
      let invoicesByLineId = new Map<string, BilledInvoice[]>();

      if (poLineIds.length > 0) {
        const { data: lineBilled } = await supabase
          .from('bill_lines')
        .select('purchase_order_line_id, amount, bill_id, bills!bill_lines_bill_id_fkey(id, reference_number, bill_date, status)')
        .in('purchase_order_line_id', poLineIds);

        // Status-based rule: include only bills committed to the GL (approved or paid).
        // Review/draft and rejected bills are excluded — they are not committed cost.
        const activeBilled = (lineBilled || []).filter((bl: any) =>
          bl.bills?.status && (bl.bills.status === 'approved' || bl.bills.status === 'paid' || bl.bills.status === 'posted')
        );

        activeBilled.filter((bl: any) => {
          // Exclude the bill currently being viewed to avoid double-counting
          // (its amount is shown separately as "This Bill" via pendingBillLines).
          if (bl.bill_id === excludeBillId) return false;
          return true;
        }).forEach((bl: any) => {
          if (bl.purchase_order_line_id) {
            const current = billedByLineId.get(bl.purchase_order_line_id) || 0;
            billedByLineId.set(bl.purchase_order_line_id, current + (bl.amount || 0));

            const invoices = invoicesByLineId.get(bl.purchase_order_line_id) || [];
            invoices.push({
              bill_id: bl.bill_id,
              reference_number: bl.bills?.reference_number || 'No Ref',
              bill_date: bl.bills?.bill_date || '',
              amount: bl.amount || 0,
            });
            invoicesByLineId.set(bl.purchase_order_line_id, invoices);
          }
        });
      }

      // Group PO lines by PO (needed before PO-level billing distribution)
      const linesByPo = new Map<string, typeof poLines>();
      (poLines || []).forEach(line => {
        const arr = linesByPo.get(line.purchase_order_id) || [];
        arr.push(line);
        linesByPo.set(line.purchase_order_id, arr);
      });

      // Also fetch billed amounts at PO level (for lines linked by purchase_order_id but not purchase_order_line_id)
      const { data: poBilled } = await supabase
        .from('bill_lines')
        .select('purchase_order_id, purchase_order_line_id, cost_code_id, memo, amount, bill_id, bills!bill_lines_bill_id_fkey(id, reference_number, bill_date, status)')
        .in('purchase_order_id', poIds)
        .is('purchase_order_line_id', null);

      const activePoBilled = (poBilled || []).filter((bl: any) =>
        bl.bills?.status && bl.bills.status !== 'draft'
      );

      // --- Helper: simple keyword overlap for memo-to-description matching ---
      const ORDINAL_MAP: Record<string, string> = {
        '1st': 'first', '2nd': 'second', '3rd': 'third',
        '4th': 'fourth', '5th': 'fifth', '6th': 'sixth',
      };
      const normToken = (t: string) => {
        const low = t.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!low) return '';
        const mapped = ORDINAL_MAP[low];
        if (mapped) return mapped;
        // Basic depluralize
        if (low.endsWith('s') && low.length > 3 && !low.endsWith('ss')) return low.slice(0, -1);
        return low;
      };
      const tokenize = (text: string | null) =>
        (text || '').split(/\s+/).map(normToken).filter(t => t.length > 1);

      const memoMatchScore = (memo: string | null, description: string | null): number => {
        const memoTokens = tokenize(memo);
        const descTokens = tokenize(description);
        if (memoTokens.length === 0 || descTokens.length === 0) return 0;
        let hits = 0;
        for (const dt of descTokens) {
          if (memoTokens.some(mt => mt === dt || mt.includes(dt) || dt.includes(mt))) hits++;
        }
        return hits;
      };

      // Distribute PO-level billing to line items by cost_code + memo match, or keep as unallocated
      const billedByPoIdOnly = new Map<string, number>();
      const unallocatedInvoicesByPoId = new Map<string, BilledInvoice[]>();
      activePoBilled.filter((bl: any) => {
        if (bl.bill_id === excludeBillId) return false;
        if (excludeBillDate && bl.bills?.bill_date > excludeBillDate) return false;
        if (excludeBillDate && bl.bills?.bill_date === excludeBillDate && bl.bill_id > excludeBillId) return false;
        return true;
      }).forEach((bl: any) => {
        if (!bl.purchase_order_id) return;

        const invoice: BilledInvoice = {
          bill_id: bl.bill_id,
          reference_number: bl.bills?.reference_number || 'No Ref',
          bill_date: bl.bills?.bill_date || '',
          amount: bl.amount || 0,
        };

        const poLineList = linesByPo.get(bl.purchase_order_id) || [];

        // Tier 1: Find PO lines matching cost_code_id
        const ccMatches = bl.cost_code_id
          ? poLineList.filter(l => l.cost_code_id === bl.cost_code_id)
          : [];

        let matched: typeof poLineList[number] | null = null;

        if (ccMatches.length === 1) {
          // Unique cost code match — attribute directly
          matched = ccMatches[0];
        } else if (ccMatches.length > 1) {
          // Tier 2: Multiple lines share cost code — use memo keyword overlap
          let bestScore = 0;
          let bestLine: typeof poLineList[number] | null = null;
          for (const line of ccMatches) {
            const score = memoMatchScore(bl.memo, line.description);
            if (score > bestScore) {
              bestScore = score;
              bestLine = line;
            }
          }
          if (bestScore >= 1 && bestLine) {
            matched = bestLine;
          }
        }

        if (matched) {
          billedByLineId.set(matched.id, (billedByLineId.get(matched.id) || 0) + (bl.amount || 0));
          const invoices = invoicesByLineId.get(matched.id) || [];
          invoices.push(invoice);
          invoicesByLineId.set(matched.id, invoices);
        } else {
          // Tier 3: Unallocated
          billedByPoIdOnly.set(bl.purchase_order_id, (billedByPoIdOnly.get(bl.purchase_order_id) || 0) + (bl.amount || 0));
          const invoices = unallocatedInvoicesByPoId.get(bl.purchase_order_id) || [];
          invoices.push(invoice);
          unallocatedInvoicesByPoId.set(bl.purchase_order_id, invoices);
        }
      });

      // Build result
      return pos.map(po => {
        const costCodeData = po.cost_code_id ? costCodeMap.get(po.cost_code_id) : null;
        const lines = linesByPo.get(po.id) || [];

        const lineItems: POLineItem[] = lines.map(line => {
          const lineCostCode = line.cost_code_id ? costCodeMap.get(line.cost_code_id) : null;
          const totalLineBilled = billedByLineId.get(line.id) || 0;
          return {
            id: line.id,
            line_number: line.line_number,
            description: line.description,
            cost_code_id: line.cost_code_id,
            cost_code: lineCostCode || undefined,
            quantity: line.quantity || 0,
            unit_cost: line.unit_cost || 0,
            amount: line.amount || 0,
            total_billed: totalLineBilled,
            remaining: (line.amount || 0) - totalLineBilled,
            billed_invoices: invoicesByLineId.get(line.id) || [],
          };
        });

        // Total billed = sum of line-level billing + PO-level-only billing (explicit links only)
        const lineLevelBilled = lineItems.reduce((s, l) => s + l.total_billed, 0);
        const poLevelOnlyBilled = billedByPoIdOnly.get(po.id) || 0;
        const totalBilled = lineLevelBilled + poLevelOnlyBilled;

        return {
          id: po.id,
          po_number: po.po_number || 'Unknown',
          total_amount: po.total_amount || 0,
          cost_code_id: po.cost_code_id,
          cost_code: costCodeData || undefined,
          total_billed: totalBilled,
          remaining: (po.total_amount || 0) - totalBilled,
          unallocated_billed: poLevelOnlyBilled,
          unallocated_invoices: unallocatedInvoicesByPoId.get(po.id) || [],
          line_items: lineItems,
        };
      });
    },
    enabled: !!projectId && !!vendorId,
    staleTime: 30000,
  });
}
