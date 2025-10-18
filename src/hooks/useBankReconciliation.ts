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
        if (!bankAccountId) return { checks: [], deposits: [] };

        // Fetch checks
        let checksQuery = supabase
          .from('checks')
          .select('*')
          .eq('bank_account_id', bankAccountId)
          .eq('status', 'posted')
          .order('check_date', { ascending: true });

        if (projectId) {
          checksQuery = checksQuery.eq('project_id', projectId);
        } else {
          checksQuery = checksQuery.is('project_id', null);
        }

        const { data: checks, error: checksError } = await checksQuery;
        if (checksError) throw checksError;

        // Fetch deposits
        let depositsQuery = supabase
          .from('deposits')
          .select('*')
          .eq('bank_account_id', bankAccountId)
          .eq('status', 'posted')
          .order('deposit_date', { ascending: true });

        if (projectId) {
          depositsQuery = depositsQuery.eq('project_id', projectId);
        } else {
          depositsQuery = depositsQuery.is('project_id', null);
        }

        const { data: deposits, error: depositsError } = await depositsQuery;
        if (depositsError) throw depositsError;

        // Fetch bill payments (journal entries that credit the bank account)
        let billPaymentsQuery = supabase
          .from('journal_entries')
          .select(`
            id,
            entry_date,
            source_id,
            journal_entry_lines!inner(
              id,
              credit,
              account_id
            ),
            bills!inner(
              id,
              reference_number,
              reconciled,
              reconciliation_date,
              reconciliation_id,
              vendor_id,
              companies!inner(
                company_name
              )
            )
          `)
          .eq('source_type', 'bill_payment')
          .eq('journal_entry_lines.account_id', bankAccountId)
          .gt('journal_entry_lines.credit', 0);

        if (projectId) {
          billPaymentsQuery = billPaymentsQuery.eq('bills.project_id', projectId);
        } else {
          billPaymentsQuery = billPaymentsQuery.is('bills.project_id', null);
        }

        const { data: billPayments, error: billPaymentsError } = await billPaymentsQuery;
        if (billPaymentsError) throw billPaymentsError;

        // Transform data into unified format
        const checkTransactions: ReconciliationTransaction[] = (checks || []).map(check => ({
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

        // Transform bill payments into transactions
        const billPaymentTransactions: ReconciliationTransaction[] = (billPayments || []).map((je: any) => {
          const bill = je.bills;
          const journalLine = je.journal_entry_lines[0];
          const vendor = bill.companies;
          
          return {
            id: bill.id,
            date: je.entry_date,
            type: 'bill_payment' as const,
            payee: vendor.company_name,
            reference_number: bill.reference_number || undefined,
            amount: Number(journalLine.credit),
            reconciled: bill.reconciled,
            reconciliation_date: bill.reconciliation_date || undefined,
            reconciliation_id: bill.reconciliation_id || undefined,
          };
        });

        // Combine checks and bill payments, sort by date
        const allChecks = [...checkTransactions, ...billPaymentTransactions].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        return {
          checks: allChecks,
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

  return {
    useReconciliationTransactions,
    createReconciliation,
    updateReconciliation,
    markTransactionReconciled,
    useReconciliationHistory,
  };
};
