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

      // Get unique project IDs and vendor IDs from bills
      const projectIds = [...new Set(bills.map(b => b.project_id).filter(Boolean))] as string[];
      const vendorIds = [...new Set(bills.map(b => b.vendor_id))];
      
      // Get unique cost code IDs from all bill lines
      const costCodeIds = [...new Set(
        bills.flatMap(b => b.bill_lines?.map(l => l.cost_code_id).filter(Boolean) || [])
      )] as string[];

      // Get unique explicit purchase_order_ids from bill lines
      const explicitPoIds = [...new Set(
        bills.flatMap(b => b.bill_lines?.map(l => l.purchase_order_id).filter(
          id => id && id !== '__auto__' && id !== '__none__'
        ) || [])
      )] as string[];

      if (!projectIds.length || !vendorIds.length || !costCodeIds.length) {
        // Return empty matches for all bills
        const resultMap = new Map<string, BillPOMatchResult>();
        bills.forEach(bill => {
          resultMap.set(bill.id, {
            bill_id: bill.id,
            matches: [],
            overall_status: 'no_po'
          });
        });
        return resultMap;
      }

      // Fetch POs by composite key (for auto-matching)
      let compositePos: typeof explicitPos = [];
      if (projectIds.length && vendorIds.length && costCodeIds.length) {
        const { data, error } = await supabase
          .from('project_purchase_orders')
          .select(`id, po_number, total_amount, project_id, company_id, cost_code_id`)
          .in('project_id', projectIds)
          .in('company_id', vendorIds)
          .in('cost_code_id', costCodeIds);
        if (error) throw error;
        compositePos = data || [];
      }

      // Fetch explicitly linked POs by ID
      let explicitPos: Array<{ id: string; po_number: string | null; total_amount: number | null; project_id: string | null; company_id: string | null; cost_code_id: string | null }> = [];
      if (explicitPoIds.length) {
        const { data, error } = await supabase
          .from('project_purchase_orders')
          .select(`id, po_number, total_amount, project_id, company_id, cost_code_id`)
          .in('id', explicitPoIds);
        if (error) throw error;
        explicitPos = data || [];
      }

      // Merge and deduplicate
      const posMap = new Map<string, (typeof explicitPos)[0]>();
      [...compositePos, ...explicitPos].forEach(po => posMap.set(po.id, po));
      const pos = Array.from(posMap.values());

      // Collect all cost code IDs from POs too (for display)
      const allCostCodeIds = [...new Set([
        ...costCodeIds,
        ...pos.map(po => po.cost_code_id).filter(Boolean) as string[]
      ])];

      // Fetch cost codes for display
      const { data: costCodesData } = await supabase
        .from('cost_codes')
        .select('id, code, name')
        .in('id', allCostCodeIds.length ? allCostCodeIds : ['__none__']);

      const costCodeLookup = new Map<string, { code: string; name: string }>();
      (costCodesData || []).forEach(cc => {
        costCodeLookup.set(cc.id, { code: cc.code, name: cc.name });
      });

      // Fetch all posted/paid bills for the same project+vendor+cost_code combinations
      // to calculate cumulative billed amounts
      const { data: allBills, error: billsError } = await supabase
        .from('bills')
        .select(`
          id,
          vendor_id,
          project_id,
          total_amount,
          status,
          bill_lines (
            cost_code_id,
            amount
          )
        `)
        .in('project_id', projectIds)
        .in('vendor_id', vendorIds)
        .in('status', ['posted', 'paid'])
        .eq('is_reversal', false)
        .is('reversed_at', null);

      if (billsError) throw billsError;

      // Build a lookup: project_id + vendor_id + cost_code_id -> { po, total_billed }
      const poLookup = new Map<string, {
        po_id: string;
        po_number: string;
        po_amount: number;
        cost_code_id: string;
        cost_code_display: string;
      }>();

      (pos || []).forEach(po => {
        const key = `${po.project_id}|${po.company_id}|${po.cost_code_id}`;
        const ccData = costCodeLookup.get(po.cost_code_id || '');
        poLookup.set(key, {
          po_id: po.id,
          po_number: po.po_number || 'Unknown',
          po_amount: po.total_amount || 0,
          cost_code_id: po.cost_code_id || '',
          cost_code_display: ccData ? `${ccData.code}: ${ccData.name}` : 'Unknown'
        });
      });

      // Calculate total billed per project+vendor+cost_code
      const billedLookup = new Map<string, number>();
      (allBills || []).forEach(bill => {
        (bill.bill_lines || []).forEach(line => {
          if (line.cost_code_id) {
            const key = `${bill.project_id}|${bill.vendor_id}|${line.cost_code_id}`;
            const current = billedLookup.get(key) || 0;
            billedLookup.set(key, current + (line.amount || 0));
          }
        });
      });

      // Now build the result map for each bill
      const resultMap = new Map<string, BillPOMatchResult>();

      bills.forEach(bill => {
        const matches: POMatch[] = [];
        
        
        // Also check lines with explicit purchase_order_id
        const allLines = bill.bill_lines || [];
        
        allLines.forEach(line => {
          // Skip lines with __none__ — user explicitly chose no PO
          if (line.purchase_order_id === '__none__') return;
          // Skip lines with no cost code and no explicit PO
          if (!line.cost_code_id && (!line.purchase_order_id || line.purchase_order_id === '__auto__')) return;
          
          let poData: { po_id: string; po_number: string; po_amount: number; cost_code_id: string; cost_code_display: string } | undefined;
          let billedKey: string | undefined;
          
          if (line.purchase_order_id && line.purchase_order_id !== '__auto__') {
            // Priority 1: Explicit PO link — look up by PO ID directly
            const explicitPo = pos.find(p => p.id === line.purchase_order_id);
            if (explicitPo) {
              const ccData = costCodeLookup.get(explicitPo.cost_code_id || '');
              poData = {
                po_id: explicitPo.id,
                po_number: explicitPo.po_number || 'Unknown',
                po_amount: explicitPo.total_amount || 0,
                cost_code_id: explicitPo.cost_code_id || '',
                cost_code_display: ccData ? `${ccData.code}: ${ccData.name}` : 'Unknown'
              };
              // Use the PO's cost code for billed lookup
              if (explicitPo.project_id && explicitPo.company_id && explicitPo.cost_code_id) {
                billedKey = `${explicitPo.project_id}|${explicitPo.company_id}|${explicitPo.cost_code_id}`;
              }
            }
          } else if (line.cost_code_id && bill.project_id) {
            // Priority 2: Auto-match by composite key
            const key = `${bill.project_id}|${bill.vendor_id}|${line.cost_code_id}`;
            poData = poLookup.get(key);
            billedKey = key;
          }
          
          if (poData && !matches.find(m => m.po_id === poData!.po_id)) {
            const totalBilled = billedKey ? (billedLookup.get(billedKey) || 0) : 0;
            const remaining = poData.po_amount - totalBilled;
            const status: 'matched' | 'over_po' = remaining >= 0 ? 'matched' : 'over_po';
            
            matches.push({
              po_id: poData.po_id,
              po_number: poData.po_number,
              po_amount: poData.po_amount,
              total_billed: totalBilled,
              remaining,
              status,
              cost_code_id: poData.cost_code_id,
              cost_code_display: poData.cost_code_display
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
    staleTime: 30000, // Cache for 30 seconds
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
