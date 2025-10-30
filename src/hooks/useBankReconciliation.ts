import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReconciliationTransaction {
  id: string;
  date: string;
  type: 'check' | 'deposit' | 'bill_payment';
  payee?: string;
  source?: string;
  reference_number?: string;
  amount: number;
  reconciled: boolean;
  reconciliation_date?: string;
  reconciliation_id?: string;
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

        // Fetch ALL unreconciled checks for this bank account (no project filter yet)
        const { data: allChecks, error: checksError } = await supabase
          .from('checks')
          .select('*')
          .eq('bank_account_id', bankAccountId)
          .eq('status', 'posted')
          .eq('reconciled', false)
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

        console.log('[Reconciliation] Final checks to use:', { count: checksToUse.length });

        // Fetch deposits
        let depositsQuery = supabase
          .from('deposits')
          .select('*')
          .eq('bank_account_id', bankAccountId)
          .eq('status', 'posted')
          .eq('reconciled', false)
          .eq('is_reversal', false)
          .is('reversed_at', null)
          .order('deposit_date', { ascending: true });

        if (projectId) {
          depositsQuery = depositsQuery.eq('project_id', projectId);
        } else {
          depositsQuery = depositsQuery.is('project_id', null);
        }

        const { data: deposits, error: depositsError } = await depositsQuery;
        console.log('[Reconciliation] Deposits:', { count: deposits?.length, error: depositsError });
        if (depositsError) throw depositsError;

        // Fetch bill payments using two-step approach
        // Step 1: Get journal entries for bill payments
        const { data: journalEntries, error: jeError } = await supabase
          .from('journal_entries')
          .select('id, entry_date, source_id')
          .eq('source_type', 'bill_payment');

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

            // Step 3: Fetch bills with project filter
            let billsQuery = supabase
              .from('bills')
              .select('id, reference_number, reconciled, reconciliation_date, reconciliation_id, vendor_id, project_id')
              .in('id', billIds)
              .eq('reconciled', false);

            if (projectId) {
              billsQuery = billsQuery.eq('project_id', projectId);
            } else {
              billsQuery = billsQuery.is('project_id', null);
            }

            const { data: bills, error: billsError } = await billsQuery;

            if (billsError) {
              console.error('[Reconciliation] Bills query failed:', billsError);
            }

            if (bills && bills.length > 0) {
              // Step 4: Fetch vendor names
              const vendorIds = [...new Set(bills.map(b => b.vendor_id))];
              const { data: vendors } = await supabase
                .from('companies')
                .select('id, company_name')
                .in('id', vendorIds);

              const vendorMap = new Map((vendors || []).map(v => [v.id, v.company_name]));

              // Step 5: Build transactions
              // For each bill, find the corresponding JE and amount
              const billToJe = new Map();
              journalEntries.forEach(je => {
                if (jeToCredit.has(je.id)) {
                  billToJe.set(je.source_id, je.id);
                }
              });

              billPaymentTransactions = bills
                .filter(bill => billToJe.has(bill.id))
                .map(bill => {
                  const jeId = billToJe.get(bill.id);
                  return {
                    id: bill.id,
                    date: jeToDate.get(jeId) || '',
                    type: 'bill_payment' as const,
                    payee: vendorMap.get(bill.vendor_id) || 'Unknown Vendor',
                    reference_number: bill.reference_number || undefined,
                    amount: jeToCredit.get(jeId) || 0,
                    reconciled: bill.reconciled,
                    reconciliation_date: bill.reconciliation_date || undefined,
                    reconciliation_id: bill.reconciliation_id || undefined,
                  };
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

        // Transform checks into transactions
        const checkTransactions: ReconciliationTransaction[] = checksToUse.map(check => ({
          id: check.id,
          date: check.check_date,
          type: 'check' as const,
          payee: check.pay_to,
          reference_number: check.check_number || undefined,
          amount: Number(check.amount),
          reconciled: check.reconciled,
          reconciliation_date: check.reconciliation_date || undefined,
          reconciliation_id: check.reconciliation_id || undefined,
        }));

        const depositTransactions: ReconciliationTransaction[] = (deposits || []).map(deposit => ({
          id: deposit.id,
          date: deposit.deposit_date,
          type: 'deposit' as const,
          source: deposit.memo || 'Deposit',
          amount: Number(deposit.amount),
          reconciled: deposit.reconciled,
          reconciliation_date: deposit.reconciliation_date || undefined,
          reconciliation_id: deposit.reconciliation_id || undefined,
        }));

        // Combine checks and bill payments, sort by date
        const allChecksAndPayments = [...checkTransactions, ...billPaymentTransactions].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        console.log('[Reconciliation] Final results:', { 
          totalChecksAndPayments: allChecksAndPayments.length,
          checkTransactions: checkTransactions.length,
          billPaymentTransactions: billPaymentTransactions.length,
          deposits: depositTransactions.length 
        });

        return {
          checks: allChecksAndPayments,
          deposits: depositTransactions,
        };
      },
      enabled: !!bankAccountId,
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
      type: 'check' | 'deposit' | 'bill_payment';
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
  };
};
