import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface POMatch {
  po_id: string;
  po_number: string;
  po_amount: number;
  total_billed: number;
  remaining: number;
  status: 'matched' | 'over_po' | 'no_po' | 'draw';
  cost_code_id: string;
  cost_code_display: string;
}

export interface BillPOMatchResult {
  bill_id: string;
  matches: POMatch[];
  overall_status: 'matched' | 'over_po' | 'no_po' | 'partial' | 'draw' | 'numerous';
}

interface BillLine {
  cost_code_id?: string;
  amount?: number;
  purchase_order_id?: string;
  po_reference?: string | null;
  cost_codes?: {
    code: string;
    name: string;
  };
}

/** Normalize a PO reference for comparison: strip non-alphanumerics and uppercase. */
function normalizePoRef(s: string | null | undefined): string {
  if (!s) return '';
  return String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

interface BillForMatching {
  id: string;
  vendor_id: string;
  project_id?: string;
  total_amount: number;
  status?: string;
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

      // Fallback: for bill lines without explicit PO, find POs by vendor + project + cost_code
      const unmatchedLines: Array<{ vendorId: string; projectId: string; costCodeId: string }> = [];
      // Also collect any po_reference strings printed on bill lines so we can look up POs by number
      const refLookups: Array<{ projectId: string; vendorId: string; ref: string }> = [];
      bills.forEach(bill => {
        (bill.bill_lines || []).forEach(line => {
          const poId = line.purchase_order_id;
          if (!poId || poId === '__none__' || poId === '__auto__') {
            if (bill.vendor_id && bill.project_id && line.cost_code_id) {
              unmatchedLines.push({
                vendorId: bill.vendor_id,
                projectId: bill.project_id,
                costCodeId: line.cost_code_id,
              });
            }
            if (bill.project_id && bill.vendor_id && line.po_reference) {
              refLookups.push({
                projectId: bill.project_id,
                vendorId: bill.vendor_id,
                ref: line.po_reference,
              });
            }
          }
        });
      });

      // Fetch POs by po_reference (printed PO number) — highest signal
      if (refLookups.length > 0) {
        const projectIds = [...new Set(refLookups.map(r => r.projectId))];
        const { data: refPos, error: refErr } = await supabase
          .from('project_purchase_orders')
          .select(`id, po_number, total_amount, project_id, company_id, cost_code_id`)
          .in('project_id', projectIds);
        if (!refErr && refPos) {
          refPos.forEach(po => {
            if (!pos.find(p => p.id === po.id)) pos.push(po);
          });
        }
      }

      // Fetch POs for unmatched lines by vendor + project
      if (unmatchedLines.length > 0) {
        const vendorProjectPairs = [...new Set(
          unmatchedLines.map(l => `${l.vendorId}|${l.projectId}`)
        )];
        
        for (const pair of vendorProjectPairs) {
          const [vendorId, projectId] = pair.split('|');
          const costCodeIds = [...new Set(
            unmatchedLines
              .filter(l => l.vendorId === vendorId && l.projectId === projectId)
              .map(l => l.costCodeId)
          )];
          
          const { data: fallbackPos, error } = await supabase
            .from('project_purchase_orders')
            .select(`id, po_number, total_amount, project_id, company_id, cost_code_id`)
            .eq('company_id', vendorId)
            .eq('project_id', projectId)
            .in('cost_code_id', costCodeIds);
          
          if (!error && fallbackPos) {
            fallbackPos.forEach(po => {
              if (!pos.find(p => p.id === po.id)) {
                pos.push(po);
              }
            });
          }
        }
      }

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

        // Status-based rule: include only bills committed to the GL (approved or paid).
        // Review/draft and rejected bills are excluded — they are not committed cost.
        (linkedLines || []).forEach(line => {
          const billData = line.bills as unknown as { status: string; is_reversal: boolean; reversed_at: string | null };
          if (
            billData &&
            ['approved', 'paid', 'posted'].includes(billData.status) &&
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

          // HIGHEST PRIORITY: if the invoice line printed a PO number, match by PO number
          if (!resolvedPoId && line.po_reference && bill.project_id && bill.vendor_id) {
            const target = normalizePoRef(line.po_reference);
            if (target) {
              const byNumber = pos.find(p =>
                p.project_id === bill.project_id &&
                (p.company_id === bill.vendor_id || !p.company_id) &&
                normalizePoRef(p.po_number).includes(target)
              ) || pos.find(p =>
                p.project_id === bill.project_id &&
                normalizePoRef(p.po_number).includes(target)
              );
              if (byNumber) resolvedPoId = byNumber.id;
            }
          }

          // Fallback: if no explicit PO link, match by vendor + project + cost_code
          if (!resolvedPoId && line.cost_code_id && bill.vendor_id && bill.project_id) {
            const candidatePos = pos.filter(p =>
              p.company_id === bill.vendor_id &&
              p.project_id === bill.project_id &&
              p.cost_code_id === line.cost_code_id
            );
            if (candidatePos.length === 1) {
              resolvedPoId = candidatePos[0].id;
            } else if (candidatePos.length > 1) {
              // Multiple POs for same cost code — prefer PO where bill fits within remaining budget
              const lineAmount = line.amount || 0;
              const fittingPos = candidatePos.filter(p => {
                const poAmount = p.total_amount || 0;
                const alreadyBilled = billedLookup.get(p.id) || 0;
                return (poAmount - alreadyBilled - lineAmount) >= 0;
              });
              
              if (fittingPos.length === 1) {
                resolvedPoId = fittingPos[0].id;
              } else if (fittingPos.length > 1) {
                // First: prefer PO whose total matches the bill line exactly
                const exactMatch = fittingPos.find(p => (p.total_amount || 0) === lineAmount);
                if (exactMatch) {
                  resolvedPoId = exactMatch.id;
                } else {
                  // Fallback: pick largest PO (most likely the parent contract)
                  let bestPo = fittingPos[0];
                  for (let i = 1; i < fittingPos.length; i++) {
                    if ((fittingPos[i].total_amount || 0) > (bestPo.total_amount || 0)) {
                      bestPo = fittingPos[i];
                    }
                  }
                  resolvedPoId = bestPo.id;
                }
              } else {
                // No PO can accommodate — prefer exact amount match first
                const exactMatch = candidatePos.find(p => (p.total_amount || 0) === lineAmount);
                if (exactMatch) {
                  resolvedPoId = exactMatch.id;
                } else {
                  // Fallback: pick largest PO
                  let bestPo = candidatePos[0];
                  for (let i = 1; i < candidatePos.length; i++) {
                    if ((candidatePos[i].total_amount || 0) > (bestPo.total_amount || 0)) {
                      bestPo = candidatePos[i];
                    }
                  }
                  resolvedPoId = bestPo.id;
                }
              }
            }
          }
          
          if (!resolvedPoId) return;
          
          const matchedPo = pos.find(p => p.id === resolvedPoId);
          if (!matchedPo) return;
          
          if (!matches.find(m => m.po_id === matchedPo.id)) {
            const ccData = costCodeLookup.get(matchedPo.cost_code_id || '');
            const totalBilled = billedLookup.get(matchedPo.id) || 0;
            const poAmount = matchedPo.total_amount || 0;
            const isDraftBill = (bill.status || 'draft') === 'draft';

            // Current bill's lines allocated to this PO — mirror dialog resolution chain:
            // 1) explicit purchase_order_id, 2) printed po_reference, 3) unique cost_code fallback.
            const matchedPoNumNorm = normalizePoRef(matchedPo.po_number);
            const thisBillAmount = allLines
              .filter(l => {
                let lpId = l.purchase_order_id;
                if (lpId === '__none__' || lpId === '__auto__') lpId = undefined;
                if (lpId === matchedPo.id) return true;
                if (lpId && lpId !== matchedPo.id) return false; // explicitly assigned elsewhere
                if (l.po_reference && matchedPoNumNorm) {
                  const target = normalizePoRef(l.po_reference);
                  if (target && (target === matchedPoNumNorm || matchedPoNumNorm.includes(target) || target.includes(matchedPoNumNorm))) {
                    return true;
                  }
                  // printed a different PO — exclude from this PO
                  if (target) return false;
                }
                if (l.cost_code_id === matchedPo.cost_code_id) {
                  // Only attribute by cost_code if no other matched PO shares it
                  const sharedPos = pos.filter(p =>
                    p.company_id === bill.vendor_id &&
                    p.project_id === bill.project_id &&
                    p.cost_code_id === matchedPo.cost_code_id
                  );
                  if (sharedPos.length <= 1) return true;
                }
                return false;
              })
              .reduce((s, l) => s + (l.amount || 0), 0);

            // For draft bills: forecast (totalBilled excludes this bill, so add thisBillAmount).
            // For posted/paid bills: this bill is already in totalBilled — do NOT double-count.
            const projectedBilled = isDraftBill ? (totalBilled + thisBillAmount) : totalBilled;
            // Cent-precise to avoid $0.01 floating-point drift causing false "Over"
            const remainingCents = Math.round((poAmount - projectedBilled) * 100);
            const remaining = remainingCents / 100;
            const billedAgainstPo = isDraftBill ? thisBillAmount : (totalBilled > 0 ? thisBillAmount || totalBilled : thisBillAmount);
            const isDraw = remainingCents >= 0 && billedAgainstPo < poAmount && poAmount > 0;
            const status: 'matched' | 'over_po' | 'draw' = remainingCents < 0 ? 'over_po' : isDraw ? 'draw' : 'matched';
            
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

        // Determine overall status by status mix (not by distinct PO count):
        // - 0 matches → no_po
        // - any over_po combined with a matched/draw line → numerous (mixed: some fine, some over)
        // - all over_po → over_po
        // - all matched/draw → matched (treat draw as a healthy match for rollup)
        // - otherwise fall back to first status
        let overall_status: 'matched' | 'over_po' | 'no_po' | 'partial' | 'draw' | 'numerous';
        if (matches.length === 0) {
          overall_status = 'no_po';
        } else {
          const hasOver = matches.some(m => m.status === 'over_po');
          const hasHealthy = matches.some(m => m.status === 'matched' || m.status === 'draw');
          if (hasOver && hasHealthy) {
            overall_status = 'numerous';
          } else if (hasOver) {
            overall_status = 'over_po';
          } else if (hasHealthy) {
            overall_status = 'matched';
          } else {
            overall_status = matches[0].status as any;
          }
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
