import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface POMatch {
  po_id: string;
  po_number: string;
  po_amount: number;
  total_billed: number;
  remaining: number;
  status: 'matched' | 'over_po' | 'no_po';
  cost_code_id: string;
  cost_code_display: string;
}

export interface BillPOMatchResult {
  bill_id: string;
  matches: POMatch[];
  overall_status: 'matched' | 'over_po' | 'no_po' | 'partial';
}

interface BillLine {
  cost_code_id?: string;
  amount?: number;
  purchase_order_id?: string;
  cost_codes?: {
    code: string;
    name: string;
  };
}

interface BillForMatching {
  id: string;
  vendor_id: string;
  project_id?: string;
  total_amount: number;
  bill_lines?: BillLine[];
}

export interface RelatedBill {
  id: string;
  bill_date: string;
  reference_number: string | null;
  total_amount: number;
  vendor_name: string;
}

/**
 * Hook to fetch PO matching data for multiple bills at once.
 * Returns a map of bill_id -> BillPOMatchResult
 */
export function useBillPOMatching(bills: BillForMatching[]) {
  return useQuery({
    queryKey: ['bill-po-matching', bills.map(b => b.id).sort().join(',')],
    queryFn: async () => {
      if (!bills.length) return new Map<string, BillPOMatchResult>();

      // Collect only the explicitly saved purchase_order_ids from bill lines.
      const explicitPoIds = [...new Set(
        bills.flatMap(b => b.bill_lines?.map(l => l.purchase_order_id).filter(
          id => id && id !== '__auto__' && id !== '__none__'
        ) || [])
      )] as string[];

      // Also collect vendor + project + cost_code combos for fallback auto-matching
      // (for lines that have no explicit purchase_order_id)
      const unmatchedCostCodeIds = [...new Set(
        bills.flatMap(b =>
          (b.bill_lines || [])
            .filter(l => !l.purchase_order_id || l.purchase_order_id === '__auto__' || l.purchase_order_id === '__none__')
            .map(l => l.cost_code_id)
            .filter(Boolean)
        )
      )] as string[];

      const vendorIds = [...new Set(bills.map(b => b.vendor_id).filter(Boolean))] as string[];
      const projectIds = [...new Set(
        bills.map(b => b.project_id).filter(Boolean)
      )] as string[];

      // Fetch explicitly linked POs
      let pos: Array<{ id: string; po_number: string | null; total_amount: number | null; project_id: string | null; company_id: string | null; cost_code_id: string | null }> = [];
      if (explicitPoIds.length) {
        const { data, error } = await supabase
          .from('project_purchase_orders')
          .select(`id, po_number, total_amount, project_id, company_id, cost_code_id`)
          .in('id', explicitPoIds);
        if (error) throw error;
        pos = data || [];
      }

      // Fetch fallback auto-matched POs (vendor + project + cost_code)
      let fallbackPos: typeof pos = [];
      if (unmatchedCostCodeIds.length && vendorIds.length && projectIds.length) {
        const { data, error } = await supabase
          .from('project_purchase_orders')
          .select(`id, po_number, total_amount, project_id, company_id, cost_code_id`)
          .in('company_id', vendorIds)
          .in('project_id', projectIds)
          .in('cost_code_id', unmatchedCostCodeIds);
        if (error) throw error;
        fallbackPos = data || [];
      }

      // Build fallback lookup: "vendor_id|project_id|cost_code_id" -> PO
      const fallbackMap = new Map<string, typeof pos[0]>();
      fallbackPos.forEach(po => {
        if (po.company_id && po.project_id && po.cost_code_id) {
          const key = `${po.company_id}|${po.project_id}|${po.cost_code_id}`;
          if (!fallbackMap.has(key)) {
            fallbackMap.set(key, po);
          }
        }
      });

      // Merge fallback POs into the main PO list (deduped)
      const allPoIds = new Set(pos.map(p => p.id));
      fallbackPos.forEach(po => {
        if (!allPoIds.has(po.id)) {
          pos.push(po);
          allPoIds.add(po.id);
        }
      });

      // Collect cost code IDs from all POs (for display labels)
      const allCostCodeIds = [...new Set(
        pos.map(po => po.cost_code_id).filter(Boolean) as string[]
      )];

      // Fetch cost codes for display
      const { data: costCodesData } = await supabase
        .from('cost_codes')
        .select('id, code, name')
        .in('id', allCostCodeIds.length ? allCostCodeIds : ['__none__']);

      const costCodeLookup = new Map<string, { code: string; name: string }>();
      (costCodesData || []).forEach(cc => {
        costCodeLookup.set(cc.id, { code: cc.code, name: cc.name });
      });

      // Fetch all posted/paid bill lines explicitly linked to the relevant POs
      // to calculate cumulative billed amounts per PO
      const poIds = pos.map(po => po.id);
      const billedLookup = new Map<string, number>();

      if (poIds.length) {
        const { data: linkedLines, error: linkedError } = await supabase
          .from('bill_lines')
          .select(`
            bill_id,
            purchase_order_id,
            amount,
            is_reversal,
            bills!inner (
              status,
              is_reversal,
              reversed_at
            )
          `)
          .in('purchase_order_id', poIds)
          .not('purchase_order_id', 'is', null);

        if (linkedError) throw linkedError;

        const billIdsToExclude = new Set(bills.map(b => b.id));

        (linkedLines || []).forEach(line => {
          if (billIdsToExclude.has(line.bill_id)) return;

          const billData = line.bills as unknown as { status: string; is_reversal: boolean; reversed_at: string | null };
          if (
            billData &&
            ['posted', 'paid'].includes(billData.status) &&
            !billData.is_reversal &&
            !billData.reversed_at &&
            line.purchase_order_id
          ) {
            const current = billedLookup.get(line.purchase_order_id) || 0;
            billedLookup.set(line.purchase_order_id, current + (line.amount || 0));
          }
        });
      }

      // Now build the result map for each bill
      const resultMap = new Map<string, BillPOMatchResult>();

      bills.forEach(bill => {
        const matches: POMatch[] = [];

        const allLines = bill.bill_lines || [];
        
        allLines.forEach(line => {
          let resolvedPoId = line.purchase_order_id;
          
          // Skip sentinel values
          if (resolvedPoId === '__none__' || resolvedPoId === '__auto__') {
            resolvedPoId = undefined;
          }
          
          // Fallback: if no explicit PO, try vendor + project + cost_code match
          if (!resolvedPoId && line.cost_code_id && bill.vendor_id && bill.project_id) {
            const key = `${bill.vendor_id}|${bill.project_id}|${line.cost_code_id}`;
            const fallbackPo = fallbackMap.get(key);
            if (fallbackPo) {
              resolvedPoId = fallbackPo.id;
            }
          }
          
          if (!resolvedPoId) return;
          
          const matchedPo = pos.find(p => p.id === resolvedPoId);
          if (!matchedPo) return;
          
          if (!matches.find(m => m.po_id === matchedPo.id)) {
            const ccData = costCodeLookup.get(matchedPo.cost_code_id || '');
            const totalBilled = billedLookup.get(matchedPo.id) || 0;
            const poAmount = matchedPo.total_amount || 0;
            const remaining = poAmount - totalBilled;
            const status: 'matched' | 'over_po' = remaining >= 0 ? 'matched' : 'over_po';
            
            matches.push({
              po_id: matchedPo.id,
              po_number: matchedPo.po_number || 'Unknown',
              po_amount: poAmount,
              total_billed: totalBilled,
              remaining,
              status,
              cost_code_id: matchedPo.cost_code_id || '',
              cost_code_display: ccData ? `${ccData.code}: ${ccData.name}` : 'Unknown'
            });
          }
        });

        // Determine overall status
        let overall_status: 'matched' | 'over_po' | 'no_po' | 'partial';
        if (matches.length === 0) {
          overall_status = 'no_po';
        } else if (matches.every(m => m.status === 'matched')) {
          overall_status = 'matched';
        } else if (matches.some(m => m.status === 'over_po')) {
          overall_status = 'over_po';
        } else {
          overall_status = 'partial';
        }

        resultMap.set(bill.id, {
          bill_id: bill.id,
          matches,
          overall_status
        });
      });

      return resultMap;
    },
    enabled: bills.length > 0,
    staleTime: 30000,
  });
}

/**
 * Fetch all bills related to a specific PO for the comparison dialog
 */
export function usePORelatedBills(
  poId: string | null,
  projectId: string | null,
  vendorId: string | null,
  costCodeId: string | null
) {
  return useQuery({
    queryKey: ['po-related-bills', poId, projectId, vendorId, costCodeId],
    queryFn: async () => {
      if (!projectId || !vendorId || !costCodeId) return [];

      const { data, error } = await supabase
        .from('bills')
        .select(`
          id,
          bill_date,
          reference_number,
          total_amount,
          companies:vendor_id (
            company_name
          ),
          bill_lines!inner (
            cost_code_id,
            amount
          )
        `)
        .eq('project_id', projectId)
        .eq('vendor_id', vendorId)
        .eq('bill_lines.cost_code_id', costCodeId)
        .in('status', ['posted', 'paid'])
        .eq('is_reversal', false)
        .is('reversed_at', null)
        .order('bill_date', { ascending: false });

      if (error) throw error;

      // Map and calculate the amount for this cost code specifically
      return (data || []).map(bill => {
        const lineAmount = (bill.bill_lines || [])
          .filter(l => l.cost_code_id === costCodeId)
          .reduce((sum, l) => sum + (l.amount || 0), 0);
        
        const companyData = bill.companies as { company_name: string } | null;
        
        return {
          id: bill.id,
          bill_date: bill.bill_date,
          reference_number: bill.reference_number,
          total_amount: lineAmount, // Amount for this specific cost code
          vendor_name: companyData?.company_name || 'Unknown'
        } as RelatedBill;
      });
    },
    enabled: !!poId && !!projectId && !!vendorId && !!costCodeId,
  });
}
