import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AllocationLot {
  name: string;
  amount: number;
}

export interface AllocationBreakdown {
  code: string;
  name: string;
  lots: AllocationLot[];
  total: number;
}

// For consolidated bill payments - shows the bills included in the payment
export interface BillPaymentAllocationSummary {
  bill_id: string;
  reference_number: string | null;
  amount_allocated: number;
}

interface ReconciliationTransaction {
  id: string;
  date: string;
  type: 'check' | 'deposit' | 'bill_payment' | 'consolidated_bill_payment' | 'journal_entry';
  payee?: string;
  source?: string;
  reference_number?: string;
  amount: number;
  reconciled: boolean;
  reconciliation_date?: string;
  reconciliation_id?: string;
  // For journal entries, we need the line id to mark as reconciled
  journal_entry_line_id?: string;
  // Cost code allocations for checks/bill payments
  allocations?: AllocationBreakdown[];
  // Account allocations for deposits
  accountAllocations?: AllocationBreakdown[];
  // For consolidated bill payments - list of bills included in this payment
  billPaymentAllocations?: BillPaymentAllocationSummary[];
}

interface BankReconciliation {
  id: string;
  owner_id: string;
  project_id?: string;
  bank_account_id: string;
  statement_date: string;
  statement_beginning_balance: number;
  statement_ending_balance: number;
  reconciled_balance: number;
  difference: number;
  status: 'in_progress' | 'completed';
  completed_at?: string;
  completed_by?: string;
  notes?: string;
  checked_transaction_ids?: string[];
  created_at: string;
  updated_at: string;
}

export const useBankReconciliation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch transactions for a specific bank account and project
  const useReconciliationTransactions = (projectId: string | null, bankAccountId: string | null) => {
    return useQuery({
      queryKey: ['reconciliation-transactions', projectId, bankAccountId],
      queryFn: async () => {
        console.log('[Reconciliation] Starting query with:', { projectId, bankAccountId });
        
        if (!bankAccountId) {
          console.log('[Reconciliation] No bankAccountId, returning empty');
          return { checks: [], deposits: [] };
        }

        // Fetch all valid reconciliation IDs for this bank account AND project to detect orphans
        // CRITICAL: Must scope by project_id to maintain project independence
        let validReconciliationsQuery = supabase
          .from('bank_reconciliations')
          .select('id')
          .eq('bank_account_id', bankAccountId);
        
        if (projectId) {
          validReconciliationsQuery = validReconciliationsQuery.eq('project_id', projectId);
        } else {
          validReconciliationsQuery = validReconciliationsQuery.is('project_id', null);
        }
        
        const { data: validReconciliations } = await validReconciliationsQuery;
        
        const validReconciliationIds = new Set((validReconciliations || []).map(r => r.id));

        // Fetch the last completed reconciliation to get the cutoff date
        // Transactions dated on or before this date should not appear (unless orphaned)
        let lastCompletedQuery = supabase
          .from('bank_reconciliations')
          .select('statement_date')
          .eq('bank_account_id', bankAccountId)
          .eq('status', 'completed')
          .order('statement_date', { ascending: false })
          .limit(1);
        
        if (projectId) {
          lastCompletedQuery = lastCompletedQuery.eq('project_id', projectId);
        } else {
          lastCompletedQuery = lastCompletedQuery.is('project_id', null);
        }
        
        const { data: lastCompletedRec } = await lastCompletedQuery.maybeSingle();
        const cutoffDate = lastCompletedRec?.statement_date || null;
        
        console.log('[Reconciliation] Cutoff date from last completed reconciliation:', cutoffDate);

        // Fetch ALL checks for this bank account (including orphaned ones)
        const { data: allChecks, error: checksError } = await supabase
          .from('checks')
          .select('*')
          .eq('bank_account_id', bankAccountId)
          .eq('status', 'posted')
          .eq('is_reversal', false)
          .is('reversed_at', null)
          .order('check_date', { ascending: true });

        if (checksError) throw checksError;
        console.log('[Reconciliation] All checks fetched:', { count: allChecks?.length });

        // Filter checks by project if projectId is provided
        let checksToUse = allChecks || [];
        if (projectId && allChecks && allChecks.length > 0) {
          // Get checks that match project in header
          const headerMatchIds = allChecks
            .filter(c => c.project_id === projectId)
            .map(c => c.id);

          // Get checks that have lines matching the project
          const checkIds = allChecks.map(c => c.id);
          const { data: checkLines } = await supabase
            .from('check_lines')
            .select('check_id')
            .in('check_id', checkIds)
            .eq('project_id', projectId);

          const lineMatchIds = [...new Set((checkLines || []).map(l => l.check_id))];

          // Combine both sets
          const allowedIds = new Set([...headerMatchIds, ...lineMatchIds]);
          checksToUse = allChecks.filter(c => allowedIds.has(c.id));
          
          console.log('[Reconciliation] Filtered checks by project:', { 
            headerMatches: headerMatchIds.length,
            lineMatches: lineMatchIds.length,
            total: checksToUse.length 
          });
        } else if (!projectId) {
          // No project filter - show only checks with no project
          checksToUse = allChecks.filter(c => !c.project_id);
        }

        // Filter checks: show unreconciled transactions after cutoff
        // Transactions with reconciliation_id from another project will be auto-fixed to become unreconciled
        checksToUse = checksToUse.filter(c => {
          // Skip reconciled checks (they're already done for this project)
          if (c.reconciled && c.reconciliation_id && validReconciliationIds.has(c.reconciliation_id)) return false;
          // If reconciled but pointing to invalid/other-project reconciliation, treat as unreconciled
          // (The edge function auto-fix will clean these up)
          const effectivelyReconciled = c.reconciled && c.reconciliation_id && validReconciliationIds.has(c.reconciliation_id);
          if (effectivelyReconciled) return false;
          // Unreconciled: exclude if dated on or before cutoff
          if (cutoffDate && c.check_date <= cutoffDate) return false;
          return true; // Normal unreconciled after cutoff
        });
        
        console.log('[Reconciliation] Final checks to use:', { count: checksToUse.length });

        // Fetch deposits (all, then filter for unreconciled + orphaned)
        let depositsQuery = supabase
          .from('deposits')
          .select('*')
          .eq('bank_account_id', bankAccountId)
          .eq('status', 'posted')
          .eq('is_reversal', false)
          .is('reversed_at', null)
          .order('deposit_date', { ascending: true });

        if (projectId) {
          depositsQuery = depositsQuery.eq('project_id', projectId);
        } else {
          depositsQuery = depositsQuery.is('project_id', null);
        }

        const { data: allDepositsRaw, error: depositsError } = await depositsQuery;
        
        // Filter deposits: show unreconciled transactions after cutoff
        const deposits = (allDepositsRaw || []).filter(d => {
          // Skip properly reconciled deposits
          const effectivelyReconciled = d.reconciled && d.reconciliation_id && validReconciliationIds.has(d.reconciliation_id);
          if (effectivelyReconciled) return false;
          // If reconciled but pointing to invalid/other-project reconciliation, treat as unreconciled
          if (d.reconciled && d.reconciliation_id && !validReconciliationIds.has(d.reconciliation_id)) {
            // This deposit will appear for reconciliation (auto-fix will clean it up)
          }
          // Unreconciled: exclude if dated on or before cutoff
          if (cutoffDate && d.deposit_date <= cutoffDate) return false;
          return true; // Normal unreconciled after cutoff
        });
        
        console.log('[Reconciliation] Deposits:', { count: deposits?.length, error: depositsError });
        if (depositsError) throw depositsError;

        // Fetch bill payments using two-step approach
        // Step 1: Get journal entries for bill payments (exclude reversed entries)
        const { data: journalEntries, error: jeError } = await supabase
          .from('journal_entries')
          .select('id, entry_date, source_id')
          .eq('source_type', 'bill_payment')
          .eq('is_reversal', false)
          .is('reversed_at', null);

        if (jeError) {
          console.error('[Reconciliation] Journal entries query failed:', jeError);
        }

        let billPaymentTransactions: ReconciliationTransaction[] = [];
        
        if (journalEntries && journalEntries.length > 0) {
          const jeIds = journalEntries.map(je => je.id);

          // Step 2: Get journal entry lines that credit this bank account
          const { data: journalLines, error: jlError } = await supabase
            .from('journal_entry_lines')
            .select('journal_entry_id, credit')
            .in('journal_entry_id', jeIds)
            .eq('account_id', bankAccountId)
            .gt('credit', 0);

          if (jlError) {
            console.error('[Reconciliation] Journal lines query failed:', jlError);
          }

          if (journalLines && journalLines.length > 0) {
            // Map journal entry to credit amount
            const jeToCredit = new Map();
            const jeToDate = new Map();
            journalLines.forEach(jl => {
              const existing = jeToCredit.get(jl.journal_entry_id) || 0;
              jeToCredit.set(jl.journal_entry_id, existing + Number(jl.credit));
            });
            journalEntries.forEach(je => {
              jeToDate.set(je.id, je.entry_date);
            });

            // Get bill IDs from journal entries
            const billIds = [...new Set(journalEntries.map(je => je.source_id))];

            // Step 3: Fetch bills with project filter (including orphaned ones)
            let billsQuery = supabase
              .from('bills')
              .select('id, reference_number, status, reconciled, reconciliation_date, reconciliation_id, vendor_id, project_id')
              .in('id', billIds);

            if (projectId) {
              billsQuery = billsQuery.eq('project_id', projectId);
            } else {
              billsQuery = billsQuery.is('project_id', null);
            }

            const { data: allBillsRaw, error: billsError } = await billsQuery;

            if (billsError) {
              console.error('[Reconciliation] Bills query failed:', billsError);
            }

            // Filter bills: show unreconciled (or orphaned treated as unreconciled)
            // We need to check the JE entry_date for cutoff since that's the payment date
            const bills = (allBillsRaw || []).filter(b => {
              // Skip reversed bills entirely - they're not real transactions anymore
              if (b.status === 'reversed') return false;
              // Properly reconciled for THIS project - skip
              const effectivelyReconciled = b.reconciled && b.reconciliation_id && validReconciliationIds.has(b.reconciliation_id);
              if (effectivelyReconciled) return false;
              // For unreconciled (or orphaned), we'll apply cutoff later when we have the JE date
              return true;
            });

            if (bills && bills.length > 0) {
              // Step 4: Fetch vendor names
              const vendorIds = [...new Set(bills.map(b => b.vendor_id))];
              const { data: vendors } = await supabase
                .from('companies')
                .select('id, company_name')
                .in('id', vendorIds);

              const vendorMap = new Map((vendors || []).map(v => [v.id, v.company_name]));

              // Step 5: Build transactions
              // For each bill, aggregate total credits from ALL related journal entries
              const billToTotalCredit = new Map<string, number>();
              const billToLatestDate = new Map<string, string>();

              journalEntries.forEach(je => {
                const jeCredit = jeToCredit.get(je.id) || 0;
                if (jeCredit > 0) {
                  const existingTotal = billToTotalCredit.get(je.source_id) || 0;
                  billToTotalCredit.set(je.source_id, existingTotal + jeCredit);
                  
                  // Keep the latest entry date for the transaction
                  const existingDate = billToLatestDate.get(je.source_id);
                  if (!existingDate || je.entry_date > existingDate) {
                    billToLatestDate.set(je.source_id, je.entry_date);
                  }
                }
              });

              billPaymentTransactions = bills
                .filter(bill => billToTotalCredit.has(bill.id))
                .map(bill => {
                  const entryDate = billToLatestDate.get(bill.id) || '';
                  // Treat orphaned as effectively unreconciled for this project
                  const effectivelyReconciled = bill.reconciled && bill.reconciliation_id && 
                    validReconciliationIds.has(bill.reconciliation_id);
                  return {
                    id: bill.id,
                    date: entryDate,
                    type: 'bill_payment' as const,
                    payee: vendorMap.get(bill.vendor_id) || 'Unknown Vendor',
                    reference_number: bill.reference_number || undefined,
                    amount: billToTotalCredit.get(bill.id) || 0,
                    reconciled: effectivelyReconciled, // Report as unreconciled if orphaned
                    reconciliation_date: effectivelyReconciled ? bill.reconciliation_date || undefined : undefined,
                    reconciliation_id: effectivelyReconciled ? bill.reconciliation_id || undefined : undefined,
                  };
                })
                // Apply cutoff filter for unreconciled bill payments
                .filter(bp => {
                  if (bp.reconciled) return false; // Hide properly reconciled
                  if (cutoffDate && bp.date <= cutoffDate) return false; // Hide old unreconciled
                  return true;
                });

              console.log('[Reconciliation] Bill payments processed:', { 
                count: billPaymentTransactions.length,
                journalEntries: journalEntries.length,
                journalLines: journalLines.length,
                bills: bills.length
              });
            }
          }
        }

        // ========== FETCH CONSOLIDATED BILL PAYMENTS ==========
        // Fetch from bill_payments table (new consolidated structure)
        let consolidatedBillPaymentQuery = supabase
          .from('bill_payments')
          .select(`
            id,
            payment_date,
            payment_account_id,
            vendor_id,
            total_amount,
            check_number,
            memo,
            reconciled,
            reconciliation_id,
            reconciliation_date
          `)
          .eq('payment_account_id', bankAccountId);

        if (projectId) {
          consolidatedBillPaymentQuery = consolidatedBillPaymentQuery.eq('project_id', projectId);
        } else {
          consolidatedBillPaymentQuery = consolidatedBillPaymentQuery.is('project_id', null);
        }

        const { data: consolidatedPayments, error: consolidatedError } = await consolidatedBillPaymentQuery;

        if (consolidatedError) {
          console.error('[Reconciliation] Consolidated bill payments query failed:', consolidatedError);
        }

        let consolidatedBillPaymentTransactions: ReconciliationTransaction[] = [];
        const billIdsInConsolidatedPayments = new Set<string>();

        if (consolidatedPayments && consolidatedPayments.length > 0) {
          // Fetch all allocations for these consolidated payments
          const consolidatedPaymentIds = consolidatedPayments.map(cp => cp.id);
          const { data: billPaymentAllocations } = await supabase
            .from('bill_payment_allocations')
            .select(`
              id,
              bill_payment_id,
              bill_id,
              amount_allocated,
              bills:bill_id (reference_number)
            `)
            .in('bill_payment_id', consolidatedPaymentIds);

          // Group allocations by payment id
          const allocationsByPayment = new Map<string, BillPaymentAllocationSummary[]>();
          if (billPaymentAllocations) {
            billPaymentAllocations.forEach(alloc => {
              const bill = alloc.bills as unknown as { reference_number: string | null } | null;
              const summary: BillPaymentAllocationSummary = {
                bill_id: alloc.bill_id,
                reference_number: bill?.reference_number || null,
                amount_allocated: Number(alloc.amount_allocated)
              };
              const existing = allocationsByPayment.get(alloc.bill_payment_id) || [];
              existing.push(summary);
              allocationsByPayment.set(alloc.bill_payment_id, existing);
              
              // Track bill IDs to exclude from legacy transactions
              billIdsInConsolidatedPayments.add(alloc.bill_id);
            });
          }

          // Get vendor names
          const vendorIds = [...new Set(consolidatedPayments.map(cp => cp.vendor_id))];
          const { data: vendors } = await supabase
            .from('companies')
            .select('id, company_name')
            .in('id', vendorIds);
          const vendorMap = new Map((vendors || []).map(v => [v.id, v.company_name]));

          // Build consolidated payment transactions
          consolidatedBillPaymentTransactions = consolidatedPayments
            .filter(cp => {
              // Filter by reconciliation status
              const effectivelyReconciled = cp.reconciled && cp.reconciliation_id && 
                validReconciliationIds.has(cp.reconciliation_id);
              if (effectivelyReconciled) return false;
              // Apply cutoff filter
              if (cutoffDate && cp.payment_date <= cutoffDate) return false;
              return true;
            })
            .map(cp => ({
              id: cp.id,
              date: cp.payment_date,
              type: 'consolidated_bill_payment' as const,
              payee: vendorMap.get(cp.vendor_id) || 'Unknown Vendor',
              reference_number: cp.check_number || undefined,
              amount: Number(cp.total_amount),
              reconciled: false, // Already filtered above
              reconciliation_date: undefined,
              reconciliation_id: undefined,
              billPaymentAllocations: allocationsByPayment.get(cp.id) || [],
            }));

          // Fetch cost code allocations for consolidated bill payments
          // Get all bill IDs from allocations
          const allBillIdsForCostCodes = [...billIdsInConsolidatedPayments];
          if (allBillIdsForCostCodes.length > 0) {
            const { data: billLinesForConsolidated } = await supabase
              .from('bill_lines')
              .select(`
                bill_id,
                amount,
                cost_code_id,
                lot_id,
                cost_codes:cost_code_id (code, name),
                project_lots:lot_id (lot_number)
              `)
              .in('bill_id', allBillIdsForCostCodes);

            if (billLinesForConsolidated) {
              // Group by bill_id first
              const linesByBill = new Map<string, typeof billLinesForConsolidated>();
              billLinesForConsolidated.forEach(line => {
                const existing = linesByBill.get(line.bill_id) || [];
                existing.push(line);
                linesByBill.set(line.bill_id, existing);
              });

              // For each consolidated payment, aggregate allocations from all its bills
              consolidatedBillPaymentTransactions = consolidatedBillPaymentTransactions.map(cp => {
                const paymentAllocations = allocationsByPayment.get(cp.id) || [];
                const allAllocations: AllocationBreakdown[] = [];
                const byCostCode = new Map<string, { code: string; name: string; lots: AllocationLot[] }>();

                paymentAllocations.forEach(pa => {
                  const linesForBill = linesByBill.get(pa.bill_id) || [];
                  linesForBill.forEach(line => {
                    if (!line.cost_code_id || !line.cost_codes) return;
                    const costCode = line.cost_codes as unknown as { code: string; name: string };
                    const key = line.cost_code_id;
                    if (!byCostCode.has(key)) {
                      byCostCode.set(key, { 
                        code: costCode.code, 
                        name: costCode.name, 
                        lots: [] 
                      });
                    }
                    const lot = line.project_lots as unknown as { lot_number: string } | null;
                    byCostCode.get(key)!.lots.push({
                      name: lot?.lot_number || 'No Lot',
                      amount: Number(line.amount)
                    });
                  });
                });

                byCostCode.forEach((cc) => {
                  allAllocations.push({
                    code: cc.code,
                    name: cc.name,
                    lots: cc.lots,
                    total: cc.lots.reduce((sum, l) => sum + l.amount, 0)
                  });
                });

                return {
                  ...cp,
                  allocations: allAllocations
                };
              });
            }
          }

          console.log('[Reconciliation] Consolidated bill payments processed:', { 
            count: consolidatedBillPaymentTransactions.length,
            totalConsolidated: consolidatedPayments.length,
            billsIncluded: billIdsInConsolidatedPayments.size
          });
        }

        // Filter legacy bill payments to exclude those in consolidated payments
        billPaymentTransactions = billPaymentTransactions.filter(bp => 
          !billIdsInConsolidatedPayments.has(bp.id)
        );

        console.log('[Reconciliation] Legacy bill payments after filtering:', { 
          count: billPaymentTransactions.length 
        });


        // Get manual journal entries that affect this bank account
        const { data: manualJournalEntries, error: mjeError } = await supabase
          .from('journal_entries')
          .select(`
            id,
            entry_date,
            description,
            source_type
          `)
          .eq('source_type', 'manual')
          .eq('is_reversal', false)
          .is('reversed_at', null);

        if (mjeError) {
          console.error('[Reconciliation] Manual journal entries query failed:', mjeError);
        }

        let manualJournalCredits: ReconciliationTransaction[] = [];
        let manualJournalDebits: ReconciliationTransaction[] = [];
        let journalAccountAllocationsMap: Map<string, AllocationBreakdown[]> = new Map();

        if (manualJournalEntries && manualJournalEntries.length > 0) {
          const mjeIds = manualJournalEntries.map(je => je.id);

          // Get journal entry lines that affect this bank account (both debits and credits, including orphaned)
          const { data: allManualLinesRaw, error: mlError } = await supabase
            .from('journal_entry_lines')
            .select('id, journal_entry_id, debit, credit, project_id, reconciled, reconciliation_id, reconciliation_date')
            .in('journal_entry_id', mjeIds)
            .eq('account_id', bankAccountId);

          if (mlError) {
            console.error('[Reconciliation] Manual journal lines query failed:', mlError);
          }

          // Filter: show unreconciled (or orphaned treated as unreconciled)
          // Cutoff will be applied later when we have the JE date
          const manualLines = (allManualLinesRaw || []).filter(l => {
            // Properly reconciled for THIS project - skip
            const effectivelyReconciled = l.reconciled && l.reconciliation_id && validReconciliationIds.has(l.reconciliation_id);
            if (effectivelyReconciled) return false;
            return true; // Unreconciled (or orphaned) - cutoff applied later
          });

          if (manualLines && manualLines.length > 0) {
            // Create a map of journal entry id to entry data
            const jeMap = new Map(manualJournalEntries.map(je => [je.id, je]));

            // Process each line - filter by project if needed
            manualLines.forEach(line => {
              const je = jeMap.get(line.journal_entry_id);
              if (!je) return;

              // Apply project filter
              if (projectId) {
                if (line.project_id !== projectId) return;
              } else {
                if (line.project_id) return;
              }

              const debit = Number(line.debit) || 0;
              const credit = Number(line.credit) || 0;
              
              // Treat orphaned as effectively unreconciled for this project
              const effectivelyReconciled = line.reconciled && line.reconciliation_id && 
                validReconciliationIds.has(line.reconciliation_id);

              // Apply cutoff filter for unreconciled manual JE lines
              const shouldInclude = !effectivelyReconciled && (!cutoffDate || je.entry_date > cutoffDate);
              
              if (credit > 0 && shouldInclude) {
                // Credits to bank account = money going OUT (like checks)
                manualJournalCredits.push({
                  id: line.id, // Use line id as the transaction id
                  journal_entry_line_id: line.id,
                  date: je.entry_date,
                  type: 'journal_entry' as const,
                  payee: je.description || 'Journal Entry',
                  reference_number: 'JE',
                  amount: credit,
                  reconciled: false, // Treat as unreconciled for this project
                  reconciliation_date: undefined,
                  reconciliation_id: undefined,
                });
              } else if (debit > 0 && shouldInclude) {
                // Debits to bank account = money coming IN (like deposits)
                manualJournalDebits.push({
                  id: line.id, // Use line id as the transaction id
                  journal_entry_line_id: line.id,
                  date: je.entry_date,
                  type: 'journal_entry' as const,
                  source: je.description || 'Journal Entry',
                  reference_number: 'JE',
                  amount: debit,
                  reconciled: false, // Treat as unreconciled for this project
                  reconciliation_date: undefined,
                  reconciliation_id: undefined,
                });
              }
            });

            console.log('[Reconciliation] Manual journal entries processed:', {
              credits: manualJournalCredits.length,
              debits: manualJournalDebits.length
            });
          }
        }

        // ========== FETCH ACCOUNT ALLOCATIONS FOR JOURNAL ENTRIES ==========
        // For journal entries, fetch the account info for each line
        const allJELineIds = [...manualJournalCredits, ...manualJournalDebits].map(je => je.id);
        if (allJELineIds.length > 0) {
          const { data: jeLinesWithAccounts } = await supabase
            .from('journal_entry_lines')
            .select(`
              id,
              account_id,
              debit,
              credit,
              lot_id,
              accounts:account_id (code, name),
              project_lots:lot_id (lot_number)
            `)
            .in('id', allJELineIds);

          if (jeLinesWithAccounts) {
            jeLinesWithAccounts.forEach(line => {
              if (!line.account_id || !line.accounts) return;
              const account = line.accounts as unknown as { code: string; name: string };
              const lot = line.project_lots as unknown as { lot_number: string } | null;
              const amount = Number(line.debit) || Number(line.credit) || 0;
              
              const allocation: AllocationBreakdown = {
                code: account.code,
                name: account.name,
                lots: [{
                  name: lot?.lot_number || 'No Lot',
                  amount: amount
                }],
                total: amount
              };
              journalAccountAllocationsMap.set(line.id, [allocation]);
            });
          }

          // Add account allocations to journal entry transactions
          manualJournalCredits = manualJournalCredits.map(je => ({
            ...je,
            accountAllocations: journalAccountAllocationsMap.get(je.id) || []
          }));
          manualJournalDebits = manualJournalDebits.map(je => ({
            ...je,
            accountAllocations: journalAccountAllocationsMap.get(je.id) || []
          }));
        }

        let checkAllocationsMap: Map<string, AllocationBreakdown[]> = new Map();
        if (checksToUse.length > 0) {
          const checkIdsForAllocations = checksToUse.map(c => c.id);
          const { data: checkLinesWithCostCodes } = await supabase
            .from('check_lines')
            .select(`
              check_id,
              amount,
              cost_code_id,
              lot_id,
              cost_codes:cost_code_id (code, name),
              project_lots:lot_id (lot_number)
            `)
            .in('check_id', checkIdsForAllocations);

          if (checkLinesWithCostCodes) {
            // Group by check_id, then by cost_code
            const checkLinesByCheck = new Map<string, typeof checkLinesWithCostCodes>();
            checkLinesWithCostCodes.forEach(line => {
              const existing = checkLinesByCheck.get(line.check_id) || [];
              existing.push(line);
              checkLinesByCheck.set(line.check_id, existing);
            });

            checkLinesByCheck.forEach((lines, checkId) => {
              // Group by cost code
              const byCostCode = new Map<string, { code: string; name: string; lots: AllocationLot[] }>();
              lines.forEach(line => {
                if (!line.cost_code_id || !line.cost_codes) return;
                const costCode = line.cost_codes as unknown as { code: string; name: string };
                const key = line.cost_code_id;
                if (!byCostCode.has(key)) {
                  byCostCode.set(key, { 
                    code: costCode.code, 
                    name: costCode.name, 
                    lots: [] 
                  });
                }
                const lot = line.project_lots as unknown as { lot_number: string } | null;
                byCostCode.get(key)!.lots.push({
                  name: lot?.lot_number || 'No Lot',
                  amount: Number(line.amount)
                });
              });

              const allocations: AllocationBreakdown[] = Array.from(byCostCode.values()).map(cc => ({
                code: cc.code,
                name: cc.name,
                lots: cc.lots,
                total: cc.lots.reduce((sum, l) => sum + l.amount, 0)
              }));
              checkAllocationsMap.set(checkId, allocations);
            });
          }
        }

        // ========== FETCH ACCOUNT ALLOCATIONS FOR CHECKS ==========
        let checkAccountAllocationsMap: Map<string, AllocationBreakdown[]> = new Map();
        if (checksToUse.length > 0) {
          const checkIdsForAccountAllocations = checksToUse.map(c => c.id);
          const { data: checkLinesWithAccounts } = await supabase
            .from('check_lines')
            .select(`
              check_id,
              amount,
              account_id,
              lot_id,
              accounts:account_id (code, name),
              project_lots:lot_id (lot_number)
            `)
            .in('check_id', checkIdsForAccountAllocations);

          if (checkLinesWithAccounts) {
            // Group by check_id, then by account
            const checkLinesByCheckForAccounts = new Map<string, typeof checkLinesWithAccounts>();
            checkLinesWithAccounts.forEach(line => {
              const existing = checkLinesByCheckForAccounts.get(line.check_id) || [];
              existing.push(line);
              checkLinesByCheckForAccounts.set(line.check_id, existing);
            });

            checkLinesByCheckForAccounts.forEach((lines, checkId) => {
              // Group by account
              const byAccount = new Map<string, { code: string; name: string; lots: AllocationLot[] }>();
              lines.forEach(line => {
                if (!line.account_id || !line.accounts) return;
                const account = line.accounts as unknown as { code: string; name: string };
                const key = line.account_id;
                if (!byAccount.has(key)) {
                  byAccount.set(key, { 
                    code: account.code, 
                    name: account.name, 
                    lots: [] 
                  });
                }
                const lot = line.project_lots as unknown as { lot_number: string } | null;
                byAccount.get(key)!.lots.push({
                  name: lot?.lot_number || 'No Lot',
                  amount: Number(line.amount)
                });
              });

              const allocations: AllocationBreakdown[] = Array.from(byAccount.values()).map(acc => ({
                code: acc.code,
                name: acc.name,
                lots: acc.lots,
                total: acc.lots.reduce((sum, l) => sum + l.amount, 0)
              }));
              checkAccountAllocationsMap.set(checkId, allocations);
            });
          }
        }

        // ========== FETCH ACCOUNT ALLOCATIONS FOR DEPOSITS ==========
        let depositAllocationsMap: Map<string, AllocationBreakdown[]> = new Map();
        const depositIds = (deposits || []).map(d => d.id);
        if (depositIds.length > 0) {
          const { data: depositLinesWithAccounts } = await supabase
            .from('deposit_lines')
            .select(`
              deposit_id,
              amount,
              account_id,
              lot_id,
              accounts:account_id (code, name),
              project_lots:lot_id (lot_number)
            `)
            .in('deposit_id', depositIds);

          if (depositLinesWithAccounts) {
            // Group by deposit_id, then by account
            const depositLinesByDeposit = new Map<string, typeof depositLinesWithAccounts>();
            depositLinesWithAccounts.forEach(line => {
              const existing = depositLinesByDeposit.get(line.deposit_id) || [];
              existing.push(line);
              depositLinesByDeposit.set(line.deposit_id, existing);
            });

            depositLinesByDeposit.forEach((lines, depositId) => {
              // Group by account
              const byAccount = new Map<string, { code: string; name: string; lots: AllocationLot[] }>();
              lines.forEach(line => {
                if (!line.account_id || !line.accounts) return;
                const account = line.accounts as unknown as { code: string; name: string };
                const key = line.account_id;
                if (!byAccount.has(key)) {
                  byAccount.set(key, { 
                    code: account.code, 
                    name: account.name, 
                    lots: [] 
                  });
                }
                const lot = line.project_lots as unknown as { lot_number: string } | null;
                byAccount.get(key)!.lots.push({
                  name: lot?.lot_number || 'No Lot',
                  amount: Number(line.amount)
                });
              });

              const allocations: AllocationBreakdown[] = Array.from(byAccount.values()).map(acc => ({
                code: acc.code,
                name: acc.name,
                lots: acc.lots,
                total: acc.lots.reduce((sum, l) => sum + l.amount, 0)
              }));
              depositAllocationsMap.set(depositId, allocations);
            });
          }
        }

        // ========== FETCH COST CODE ALLOCATIONS FOR BILL PAYMENTS ==========
        let billAllocationsMap: Map<string, AllocationBreakdown[]> = new Map();
        const billPaymentIds = billPaymentTransactions.map(bp => bp.id);
        if (billPaymentIds.length > 0) {
          const { data: billLinesWithCostCodes } = await supabase
            .from('bill_lines')
            .select(`
              bill_id,
              amount,
              cost_code_id,
              lot_id,
              cost_codes:cost_code_id (code, name),
              project_lots:lot_id (lot_number)
            `)
            .in('bill_id', billPaymentIds);

          if (billLinesWithCostCodes) {
            // Group by bill_id, then by cost_code
            const billLinesByBill = new Map<string, typeof billLinesWithCostCodes>();
            billLinesWithCostCodes.forEach(line => {
              const existing = billLinesByBill.get(line.bill_id) || [];
              existing.push(line);
              billLinesByBill.set(line.bill_id, existing);
            });

            billLinesByBill.forEach((lines, billId) => {
              // Group by cost code
              const byCostCode = new Map<string, { code: string; name: string; lots: AllocationLot[] }>();
              lines.forEach(line => {
                if (!line.cost_code_id || !line.cost_codes) return;
                const costCode = line.cost_codes as unknown as { code: string; name: string };
                const key = line.cost_code_id;
                if (!byCostCode.has(key)) {
                  byCostCode.set(key, { 
                    code: costCode.code, 
                    name: costCode.name, 
                    lots: [] 
                  });
                }
                const lot = line.project_lots as unknown as { lot_number: string } | null;
                byCostCode.get(key)!.lots.push({
                  name: lot?.lot_number || 'No Lot',
                  amount: Number(line.amount)
                });
              });

              const allocations: AllocationBreakdown[] = Array.from(byCostCode.values()).map(cc => ({
                code: cc.code,
                name: cc.name,
                lots: cc.lots,
                total: cc.lots.reduce((sum, l) => sum + l.amount, 0)
              }));
              billAllocationsMap.set(billId, allocations);
            });
          }
        }

        // Add allocations to bill payment transactions
        billPaymentTransactions = billPaymentTransactions.map(bp => ({
          ...bp,
          allocations: billAllocationsMap.get(bp.id) || []
        }));

        // Transform checks into transactions
        // Treat orphaned (reconciled to another project) as effectively unreconciled
        const checkTransactions: ReconciliationTransaction[] = checksToUse.map(check => {
          const effectivelyReconciled = check.reconciled && check.reconciliation_id && 
            validReconciliationIds.has(check.reconciliation_id);
          return {
            id: check.id,
            date: check.check_date,
            type: 'check' as const,
            payee: check.pay_to,
            reference_number: check.check_number || undefined,
            amount: Number(check.amount),
            reconciled: effectivelyReconciled, // Report as unreconciled if orphaned
            reconciliation_date: effectivelyReconciled ? check.reconciliation_date || undefined : undefined,
            reconciliation_id: effectivelyReconciled ? check.reconciliation_id || undefined : undefined,
            allocations: checkAllocationsMap.get(check.id) || [],
            accountAllocations: checkAccountAllocationsMap.get(check.id) || [],
          };
        });

        const depositTransactions: ReconciliationTransaction[] = (deposits || []).map(deposit => {
          const effectivelyReconciled = deposit.reconciled && deposit.reconciliation_id && 
            validReconciliationIds.has(deposit.reconciliation_id);
          return {
            id: deposit.id,
            date: deposit.deposit_date,
            type: 'deposit' as const,
            source: deposit.memo || 'Deposit',
            amount: Number(deposit.amount),
            reconciled: effectivelyReconciled, // Report as unreconciled if orphaned
            reconciliation_date: effectivelyReconciled ? deposit.reconciliation_date || undefined : undefined,
            reconciliation_id: effectivelyReconciled ? deposit.reconciliation_id || undefined : undefined,
            accountAllocations: depositAllocationsMap.get(deposit.id) || [],
          };
        });

        // Combine checks, bill payments, consolidated bill payments, and journal entry credits (all are money out)
        const allChecksAndPayments = [
          ...checkTransactions, 
          ...billPaymentTransactions,
          ...consolidatedBillPaymentTransactions,
          ...manualJournalCredits
        ].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Combine deposits and journal entry debits (all are money in)
        const allDeposits = [
          ...depositTransactions,
          ...manualJournalDebits
        ].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        console.log('[Reconciliation] Final results:', { 
          totalChecksAndPayments: allChecksAndPayments.length,
          checkTransactions: checkTransactions.length,
          billPaymentTransactions: billPaymentTransactions.length,
          manualJournalCredits: manualJournalCredits.length,
          deposits: allDeposits.length,
          manualJournalDebits: manualJournalDebits.length
        });

        return {
          checks: allChecksAndPayments,
          deposits: allDeposits,
        };
      },
      enabled: !!bankAccountId,
      staleTime: 30000, // 30 seconds - prevent excessive refetches that trigger spinner
    });
  };

  // Create new reconciliation
  const createReconciliation = useMutation({
    mutationFn: async (data: Omit<BankReconciliation, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('bank_reconciliations')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
      toast({
        title: "Reconciliation saved",
        description: "Your reconciliation progress has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update existing reconciliation
  const updateReconciliation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BankReconciliation> }) => {
      const { error } = await supabase
        .from('bank_reconciliations')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
      toast({
        title: "Reconciliation updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark transaction as reconciled/unreconciled
  const markTransactionReconciled = useMutation({
    mutationFn: async ({
      type,
      id,
      reconciled,
      reconciliationId,
      reconciliationDate,
    }: {
      type: 'check' | 'deposit' | 'bill_payment' | 'consolidated_bill_payment' | 'journal_entry';
      id: string;
      reconciled: boolean;
      reconciliationId?: string;
      reconciliationDate?: string;
    }) => {
      if (type === 'check') {
        const { error } = await supabase
          .from('checks')
          .update({
            reconciled,
            reconciliation_id: reconciliationId || null,
            reconciliation_date: reconciliationDate || null,
          })
          .eq('id', id);
        if (error) throw error;
      } else if (type === 'deposit') {
        const { error } = await supabase
          .from('deposits')
          .update({
            reconciled,
            reconciliation_id: reconciliationId || null,
            reconciliation_date: reconciliationDate || null,
          })
          .eq('id', id);
        if (error) throw error;
      } else if (type === 'bill_payment') {
        const { error } = await supabase
          .from('bills')
          .update({
            reconciled,
            reconciliation_id: reconciliationId || null,
            reconciliation_date: reconciliationDate || null,
          })
          .eq('id', id);
        if (error) throw error;
      } else if (type === 'consolidated_bill_payment') {
        // For consolidated bill payments, update the bill_payments table
        const { error } = await supabase
          .from('bill_payments')
          .update({
            reconciled,
            reconciliation_id: reconciliationId || null,
            reconciliation_date: reconciliationDate || null,
          })
          .eq('id', id);
        if (error) throw error;
      } else if (type === 'journal_entry') {
        // For journal entries, update the journal_entry_lines table
        const { error } = await supabase
          .from('journal_entry_lines')
          .update({
            reconciled,
            reconciliation_id: reconciliationId || null,
            reconciliation_date: reconciliationDate || null,
          })
          .eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-transactions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch reconciliation history
  const useReconciliationHistory = (projectId: string | null, bankAccountId: string | null) => {
    return useQuery({
      queryKey: ['bank-reconciliations', projectId, bankAccountId],
      queryFn: async () => {
        if (!bankAccountId) return [];

        let query = supabase
          .from('bank_reconciliations')
          .select('*')
          .eq('bank_account_id', bankAccountId)
          .eq('status', 'completed')
          .order('statement_date', { ascending: false });

        if (projectId) {
          query = query.eq('project_id', projectId);
        } else {
          query = query.is('project_id', null);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      },
      enabled: !!bankAccountId,
    });
  };

  // Fetch last completed reconciliation for a bank account (no project filter)
  const useLastCompletedReconciliation = (bankAccountId: string | null) => {
    return useQuery({
      queryKey: ['last-completed-reconciliation', bankAccountId],
      queryFn: async () => {
        if (!bankAccountId) return null;

        const { data, error } = await supabase
          .from('bank_reconciliations')
          .select('*')
          .eq('bank_account_id', bankAccountId)
          .eq('status', 'completed')
          .order('statement_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        return data;
      },
      enabled: !!bankAccountId,
    });
  };

  // Fetch reconciliation defaults using the RPC
  const useReconciliationDefaults = (bankAccountId: string | null) => {
    return useQuery({
      queryKey: ['reconciliation-defaults', bankAccountId],
      enabled: !!bankAccountId,
      queryFn: async () => {
        console.log('[Reconciliation Defaults] Fetching defaults for bank account:', bankAccountId);
        
        const { data, error } = await supabase
          .rpc('get_reconciliation_defaults', {
            bank_account_id: bankAccountId!
          });

        if (error) {
          console.error('[Reconciliation Defaults] Error:', error);
          throw error;
        }

        // The RPC returns an array with one row
        const defaults = data?.[0] || { mode: 'none', reconciliation_id: null, beginning_balance: 0, statement_date: null };
        console.log('[Reconciliation Defaults] Result:', defaults);
        return defaults;
      }
    });
  };

  // Update check transaction (date, ref #, amount)
  const updateCheckTransaction = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      const updates: any = {};
      
      if (field === 'date') {
        updates.check_date = value;
      } else if (field === 'reference_number') {
        updates.check_number = value;
      } else if (field === 'amount') {
        updates.amount = parseFloat(value);
      }

      const { error } = await supabase
        .from('checks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-transactions'] });
      toast({
        title: "Check updated",
        description: "The check has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update deposit transaction (date, amount)
  const updateDepositTransaction = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      const updates: any = {};
      
      if (field === 'date') {
        updates.deposit_date = value;
      } else if (field === 'amount') {
        updates.amount = parseFloat(value);
      }

      const { error } = await supabase
        .from('deposits')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-transactions'] });
      toast({
        title: "Deposit updated",
        description: "The deposit has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update bill payment transaction (date via journal_entries, ref # via bills, amount via journal_entry_lines)
  const updateBillPaymentTransaction = useMutation({
    mutationFn: async ({ id, field, value, bankAccountId }: { id: string; field: string; value: any; bankAccountId: string }) => {
      if (field === 'date') {
        // Update journal_entries.entry_date
        const { error } = await supabase
          .from('journal_entries')
          .update({ entry_date: value })
          .eq('source_type', 'bill_payment')
          .eq('source_id', id);
        
        if (error) throw error;
      } else if (field === 'reference_number') {
        // Update bills.reference_number
        const { error } = await supabase
          .from('bills')
          .update({ reference_number: value })
          .eq('id', id);
        
        if (error) throw error;
      } else if (field === 'amount') {
        // Update journal_entry_lines.credit for the bank account line
        const { data: journalEntry } = await supabase
          .from('journal_entries')
          .select('id')
          .eq('source_type', 'bill_payment')
          .eq('source_id', id)
          .single();
        
        if (journalEntry) {
          const { error } = await supabase
            .from('journal_entry_lines')
            .update({ credit: parseFloat(value) })
            .eq('journal_entry_id', journalEntry.id)
            .eq('account_id', bankAccountId)
            .gt('credit', 0);
          
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-transactions'] });
      toast({
        title: "Bill payment updated",
        description: "The bill payment has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Undo reconciliation - reverses all transactions and deletes the reconciliation record
  const undoReconciliation = useMutation({
    mutationFn: async (reconciliationId: string) => {
      // FIRST: Get the reconciliation details we're about to delete
      const { data: recToUndo, error: fetchError } = await supabase
        .from('bank_reconciliations')
        .select('bank_account_id, project_id')
        .eq('id', reconciliationId)
        .single();
      
      if (fetchError) throw fetchError;

      // 1. Update checks: set reconciled=false, reconciliation_id=null, reconciliation_date=null
      const { error: checksError } = await supabase
        .from('checks')
        .update({ 
          reconciled: false, 
          reconciliation_id: null, 
          reconciliation_date: null 
        })
        .eq('reconciliation_id', reconciliationId);
      
      if (checksError) throw checksError;

      // 2. Update deposits: same pattern
      const { error: depositsError } = await supabase
        .from('deposits')
        .update({ 
          reconciled: false, 
          reconciliation_id: null, 
          reconciliation_date: null 
        })
        .eq('reconciliation_id', reconciliationId);
      
      if (depositsError) throw depositsError;

      // 3. Update bills: same pattern
      const { error: billsError } = await supabase
        .from('bills')
        .update({ 
          reconciled: false, 
          reconciliation_id: null, 
          reconciliation_date: null 
        })
        .eq('reconciliation_id', reconciliationId);
      
      if (billsError) throw billsError;

      // 4. Update journal_entry_lines: same pattern for manual journal entries
      const { error: jelError } = await supabase
        .from('journal_entry_lines')
        .update({ 
          reconciled: false, 
          reconciliation_id: null, 
          reconciliation_date: null 
        })
        .eq('reconciliation_id', reconciliationId);
      
      if (jelError) throw jelError;

      // 5. Update bill_payments: clear reconciliation data for consolidated payments
      const { error: billPaymentsError } = await supabase
        .from('bill_payments')
        .update({ 
          reconciled: false, 
          reconciliation_id: null, 
          reconciliation_date: null 
        })
        .eq('reconciliation_id', reconciliationId);
      
      if (billPaymentsError) throw billPaymentsError;

      // 6. Delete the reconciliation record
      const { error: deleteError } = await supabase
        .from('bank_reconciliations')
        .delete()
        .eq('id', reconciliationId);
      
      if (deleteError) throw deleteError;

      // 6. Find the NEW "last completed" reconciliation for this bank/project
      let lastCompletedQuery = supabase
        .from('bank_reconciliations')
        .select('statement_ending_balance')
        .eq('bank_account_id', recToUndo.bank_account_id)
        .eq('status', 'completed')
        .order('statement_date', { ascending: false })
        .limit(1);
      
      if (recToUndo.project_id) {
        lastCompletedQuery = lastCompletedQuery.eq('project_id', recToUndo.project_id);
      } else {
        lastCompletedQuery = lastCompletedQuery.is('project_id', null);
      }
      
      const { data: lastCompleted } = await lastCompletedQuery.maybeSingle();
      
      // 7. Update any in-progress reconciliations with the correct beginning balance
      const newBeginningBalance = lastCompleted?.statement_ending_balance ?? 0;
      
      let updateInProgressQuery = supabase
        .from('bank_reconciliations')
        .update({ statement_beginning_balance: newBeginningBalance })
        .eq('bank_account_id', recToUndo.bank_account_id)
        .eq('status', 'in_progress');
      
      if (recToUndo.project_id) {
        updateInProgressQuery = updateInProgressQuery.eq('project_id', recToUndo.project_id);
      } else {
        updateInProgressQuery = updateInProgressQuery.is('project_id', null);
      }
      
      await updateInProgressQuery;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-transactions'] });
      toast({
        title: "Reconciliation Undone",
        description: "The reconciliation has been reversed and transactions are now editable.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Discard reconciliation via Edge Function (uses service role for reliable execution)
  const discardReconciliation = useMutation({
    mutationFn: async (reconciliationId: string) => {
      const { data, error } = await supabase.functions.invoke('discard-reconciliation', {
        body: { reconciliationId }
      });
      
      if (error) {
        console.error('[discardReconciliation] Edge function error:', error);
        throw new Error(error.message || 'Failed to discard reconciliation');
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['in-progress-reconciliation'] });
      toast({
        title: "Reconciliation Discarded",
        description: `Unlocked ${data?.discarded?.checks || 0} checks, ${data?.discarded?.deposits || 0} deposits, and ${data?.discarded?.journal_entry_lines || 0} journal entries.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    useReconciliationTransactions,
    createReconciliation,
    updateReconciliation,
    markTransactionReconciled,
    useReconciliationHistory,
    useLastCompletedReconciliation,
    useReconciliationDefaults,
    updateCheckTransaction,
    updateDepositTransaction,
    updateBillPaymentTransaction,
    undoReconciliation,
    discardReconciliation,
  };
};
