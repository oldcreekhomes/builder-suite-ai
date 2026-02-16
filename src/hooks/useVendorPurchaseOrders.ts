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
  vendorId: string | null | undefined
) {
  return useQuery({
    queryKey: ['vendor-pos', projectId, vendorId],
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
          .select('purchase_order_line_id, amount, bill_id, bills!bill_lines_bill_id_fkey(id, reference_number, bill_date)')
          .in('purchase_order_line_id', poLineIds);

        (lineBilled || []).forEach((bl: any) => {
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

      // Also fetch billed amounts at PO level (for lines linked by purchase_order_id but not purchase_order_line_id)
      const { data: poBilled } = await supabase
        .from('bill_lines')
        .select('purchase_order_id, purchase_order_line_id, cost_code_id, amount, bill_id, bills!bill_lines_bill_id_fkey(id, reference_number, bill_date)')
        .in('purchase_order_id', poIds)
        .is('purchase_order_line_id', null);

      // Track ALL PO-level billing (purchase_order_id set, purchase_order_line_id NULL)
      const billedByPoIdOnly = new Map<string, number>();
      const unallocatedInvoicesByPoId = new Map<string, BilledInvoice[]>();
      (poBilled || []).forEach((bl: any) => {
        if (bl.purchase_order_id) {
          const current = billedByPoIdOnly.get(bl.purchase_order_id) || 0;
          billedByPoIdOnly.set(bl.purchase_order_id, current + (bl.amount || 0));

          const invoices = unallocatedInvoicesByPoId.get(bl.purchase_order_id) || [];
          invoices.push({
            bill_id: bl.bill_id,
            reference_number: bl.bills?.reference_number || 'No Ref',
            bill_date: bl.bills?.bill_date || '',
            amount: bl.amount || 0,
          });
          unallocatedInvoicesByPoId.set(bl.purchase_order_id, invoices);
        }
      });

      // Also fetch implicit cost-code-based billing
      const { data: implicitBills } = await supabase
        .from('bills')
        .select(`
          id, vendor_id, project_id, status, is_reversal, reversed_at,
          bill_lines ( cost_code_id, amount, purchase_order_id, purchase_order_line_id )
        `)
        .eq('project_id', projectId)
        .eq('vendor_id', vendorId)
        .in('status', ['posted', 'paid'])
        .eq('is_reversal', false)
        .is('reversed_at', null);

      const billedByCostCode = new Map<string, number>();
      (implicitBills || []).forEach(bill => {
        (bill.bill_lines || []).forEach((line: any) => {
          if (!line.purchase_order_id && !line.purchase_order_line_id && line.cost_code_id) {
            const current = billedByCostCode.get(line.cost_code_id) || 0;
            billedByCostCode.set(line.cost_code_id, current + (line.amount || 0));
          }
        });
      });

      // Group PO lines by PO
      const linesByPo = new Map<string, typeof poLines>();
      (poLines || []).forEach(line => {
        const arr = linesByPo.get(line.purchase_order_id) || [];
        arr.push(line);
        linesByPo.set(line.purchase_order_id, arr);
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

        // Total billed = sum of line-level billing + PO-level-only billing + implicit cost code billing
        const lineLevelBilled = lineItems.reduce((s, l) => s + l.total_billed, 0);
        const poLevelOnlyBilled = billedByPoIdOnly.get(po.id) || 0;

        // Add implicit cost code billing only if no explicit links exist
        let implicitBilled = 0;
        if (lineLevelBilled === 0 && poLevelOnlyBilled === 0 && po.cost_code_id) {
          implicitBilled = billedByCostCode.get(po.cost_code_id) || 0;
        }

        const totalBilled = lineLevelBilled + poLevelOnlyBilled + implicitBilled;

        return {
          id: po.id,
          po_number: po.po_number || 'Unknown',
          total_amount: po.total_amount || 0,
          cost_code_id: po.cost_code_id,
          cost_code: costCodeData || undefined,
          total_billed: totalBilled,
          remaining: (po.total_amount || 0) - totalBilled,
          unallocated_billed: poLevelOnlyBilled + implicitBilled,
          unallocated_invoices: unallocatedInvoicesByPoId.get(po.id) || [],
          line_items: lineItems,
        };
      });
    },
    enabled: !!projectId && !!vendorId,
    staleTime: 30000,
  });
}
