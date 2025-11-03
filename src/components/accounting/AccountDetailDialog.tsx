import { useState, useEffect, useRef } from "react";
import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteButton } from "@/components/ui/delete-button";
import { useChecks } from "@/hooks/useChecks";
import { useDeposits } from "@/hooks/useDeposits";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useJournalEntries } from "@/hooks/useJournalEntries";
import { useUserRole } from "@/hooks/useUserRole";
import { AccountTransactionInlineEditor } from "./AccountTransactionInlineEditor";
import { Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useClosedPeriodCheck } from "@/hooks/useClosedPeriodCheck";

interface Transaction {
  source_id: string;
  line_id: string;
  journal_entry_id: string;
  date: string;
  memo: string | null;
  description: string | null;
  reference: string | null;
  source_type: string;
  debit: number;
  credit: number;
  created_at: string;
  reconciled: boolean;
  reconciliation_date?: string | null;
}

interface AccountDetailDialogProps {
  accountId: string | null;
  accountCode: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  projectId?: string;
  asOfDate?: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountDetailDialog({
  accountId,
  accountCode,
  accountName,
  accountType,
  projectId,
  asOfDate,
  open,
  onOpenChange,
}: AccountDetailDialogProps) {
  const [sortOrder] = useState<'asc' | 'desc'>('asc');
  const { deleteCheck, updateCheck, correctCheck } = useChecks();
  const { deleteDeposit, updateDeposit, correctDeposit } = useDeposits();
  const { deleteCreditCard, correctCreditCard } = useCreditCards();
  const { deleteManualJournalEntry, updateJournalEntryField, updateJournalEntryLine, correctManualJournalEntry } = useJournalEntries();
  const { canDeleteBills } = useUserRole();
  const queryClient = useQueryClient();
  const prevOpenRef = useRef(open);
  const { isDateLocked, latestClosedDate } = useClosedPeriodCheck(projectId);

  // Helper to parse date-only strings as local midnight (avoids timezone shift)
  const toLocalDate = (dateStr: string) => new Date(`${dateStr}T00:00:00`);

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ['account-transactions', accountId, projectId, sortOrder, asOfDate?.toISOString()],
    queryFn: async (): Promise<Transaction[]> => {
      if (!accountId) return [];

      let query = supabase
        .from('journal_entry_lines')
        .select(`
          id,
          memo,
          debit,
          credit,
          account_id,
        journal_entries!inner(
          id,
          entry_date,
          description,
          source_type,
          source_id,
          created_at,
          is_reversal,
          reversed_at,
          reversed_by_id
        )
        `)
        .eq('account_id', accountId)
        .eq('journal_entries.is_reversal', false)
        .is('journal_entries.reversed_at', null)
        .is('journal_entries.reversed_by_id', null);

      // Apply date filter if asOfDate is provided
      if (asOfDate) {
        query = query.lte('journal_entries.entry_date', asOfDate.toISOString().split('T')[0]);
      }

      if (projectId) {
        // For project-specific reports, include both project lines AND company-wide lines (null project_id)
        query = query.or(`project_id.eq.${projectId},project_id.is.null`);
      }

      // Apply stable server-side ordering to reduce reshuffling
      query = query
        .order('entry_date', { foreignTable: 'journal_entries', ascending: sortOrder !== 'desc' })
        .order('created_at', { foreignTable: 'journal_entries', ascending: sortOrder !== 'desc' })
        .order('id', { ascending: sortOrder !== 'desc' });

      const { data, error } = await query;

      if (error) throw error;

      // Get check IDs for check transactions
      const checkIds = (data || [])
        .filter((line: any) => line.journal_entries.source_type === 'check')
        .map((line: any) => line.journal_entries.source_id);

      // Get deposit IDs for deposit transactions
      const depositIds = (data || [])
        .filter((line: any) => line.journal_entries.source_type === 'deposit')
        .map((line: any) => line.journal_entries.source_id);

      // Get credit card transaction IDs
      const creditCardIds = (data || [])
        .filter((line: any) => line.journal_entries.source_type === 'credit_card')
        .map((line: any) => line.journal_entries.source_id);

      // Get bill IDs for bill and bill_payment transactions
      const billIds = (data || [])
        .filter((line: any) => ['bill', 'bill_payment'].includes(line.journal_entries.source_type))
        .map((line: any) => line.journal_entries.source_id);

      // Fetch check details with vendor names if we have any checks
      let checksMap = new Map();
      
      if (checkIds.length > 0) {
        const { data: checksData } = await supabase
          .from('checks')
          .select(`
            id, 
            memo, 
            pay_to, 
            check_number,
            reconciled,
            reconciliation_id,
            reconciliation_date,
            check_lines(memo, line_number)
          `)
          .eq('is_reversal', false)
          .is('reversed_at', null)
          .neq('status', 'reversed')
          .in('id', checkIds);
        
        // Get unique vendor IDs (UUIDs) to fetch company names
        const vendorIds = (checksData || [])
          .map(check => check.pay_to)
          .filter(payTo => {
            // Check if it's a UUID format
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payTo);
          });

        // Fetch company names for UUIDs
        let companiesMap = new Map();
        if (vendorIds.length > 0) {
          const { data: companiesData } = await supabase
            .from('companies')
            .select('id, company_name')
            .in('id', vendorIds);
          
          companiesData?.forEach(company => {
            companiesMap.set(company.id, company.company_name);
          });
        }
        
        checksData?.forEach((check: any) => {
          // If pay_to is a UUID, try to get company name; otherwise use pay_to as is
          const vendorName = companiesMap.get(check.pay_to) || check.pay_to;
          
          // Get first line memo (similar to deposits)
          const sortedLines = (check.check_lines || []).sort((a: any, b: any) => a.line_number - b.line_number);
          const firstLineMemo = sortedLines.find((line: any) => line.memo)?.memo || null;
          
          checksMap.set(check.id, {
            ...check,
            vendor_name: vendorName,
            firstLineMemo
          });
        });
      }

      // Fetch deposit details with customer names if we have any deposits
      let depositsMap = new Map();
      
      if (depositIds.length > 0) {
        const { data: depositsData } = await supabase
          .from('deposits')
          .select(`
            id, 
            memo,
            bank_account_id,
            deposit_source_id,
            reconciled,
            reconciliation_id,
            reconciliation_date,
            deposit_sources(customer_name),
            deposit_lines(memo, line_number)
          `)
          .eq('is_reversal', false)
          .is('reversed_at', null)
          .in('id', depositIds);
        
        depositsData?.forEach((deposit: any) => {
          // Received From is the deposit memo, with customer_name as fallback
          const receivedFrom = deposit.memo || deposit.deposit_sources?.customer_name || 'Cash';
          
          // First line memo is from the first deposit line
          const sortedLines = (deposit.deposit_lines || []).sort((a: any, b: any) => a.line_number - b.line_number);
          const firstLineMemo = sortedLines.find((line: any) => line.memo)?.memo || null;
          
          depositsMap.set(deposit.id, {
            ...deposit,
            receivedFrom,
            firstLineMemo,
            customer_name: deposit.deposit_sources?.customer_name || null
          });
        });
      }

      // Fetch credit card transaction details if we have any
      let creditCardsMap = new Map();
      
      if (creditCardIds.length > 0) {
        const { data: creditCardsData } = await supabase
          .from('credit_cards')
          .select(`
            id,
            vendor,
            memo,
            reconciled,
            reconciliation_id,
            reconciliation_date,
            credit_card_lines(memo, line_number)
          `)
          .eq('is_reversal', false)
          .is('reversed_at', null)
          .neq('status', 'reversed')
          .in('id', creditCardIds);
        
        creditCardsData?.forEach((cc: any) => {
          // Get first line memo as description
          const sortedLines = (cc.credit_card_lines || []).sort((a: any, b: any) => a.line_number - b.line_number);
          const firstLineMemo = sortedLines.find((line: any) => line.memo)?.memo || null;
          
          creditCardsMap.set(cc.id, {
            ...cc,
            vendor: cc.vendor,
            firstLineMemo,
            reconciled: cc.reconciled || false
          });
        });
      }

      // Fetch bill details with vendor names if we have any bills
      let billsMap = new Map();
      
      if (billIds.length > 0) {
        const { data: billsData } = await supabase
          .from('bills')
          .select(`
            id,
            vendor_id,
            reference_number,
            reconciled,
            reconciliation_id,
            reconciliation_date,
            companies(company_name)
          `)
          .eq('is_reversal', false)
          .is('reversed_at', null)
          .in('id', billIds);
        
        billsData?.forEach((bill: any) => {
          billsMap.set(bill.id, {
            ...bill,
            vendor_name: bill.companies?.company_name || 'Unknown Vendor'
          });
        });
      }

      // Client-side defensive filter: only show journal lines whose source records exist in the filtered maps
      const filteredData = (data || []).filter((line: any) => {
        const st = line.journal_entries.source_type;
        const sid = line.journal_entries.source_id;
        if (st === 'deposit') return depositsMap.has(sid);
        if (st === 'check') return checksMap.has(sid);
        if (st === 'credit_card') return creditCardsMap.has(sid);
        if (st === 'bill' || st === 'bill_payment') return billsMap.has(sid);
        return true; // keep manual types
      });

      const transactions: Transaction[] = filteredData.map((line: any) => {
        let memo = line.memo;
        let reference = null;
        let description = line.memo; // Description always comes from the line memo
        let reconciled = false;
        let reconciliation_date: string | null = null;

        // If this is a check, get reference from checks table
        if (line.journal_entries.source_type === 'check') {
          const check = checksMap.get(line.journal_entries.source_id);
          if (check) {
            memo = check.memo;
            reference = check.vendor_name || check.pay_to;
            reconciled = check.reconciled || !!check.reconciliation_id || !!check.reconciliation_date;
            reconciliation_date = check.reconciliation_date;
            // Use first check line memo as description (e.g., "Testing")
            description = check.firstLineMemo || description;
          }
        }

        // If this is a deposit, get reference from deposits table
        if (line.journal_entries.source_type === 'deposit') {
          const deposit = depositsMap.get(line.journal_entries.source_id);
          if (deposit) {
            memo = deposit.memo;
            reference = deposit.receivedFrom;
            reconciled = deposit.reconciled || !!deposit.reconciliation_id || !!deposit.reconciliation_date;
            reconciliation_date = deposit.reconciliation_date;
            // Use first deposit line memo as description
            description = deposit.firstLineMemo || description;
          }
        }

        // If this is a credit card transaction, get reference from credit_card_transactions table
        if (line.journal_entries.source_type === 'credit_card') {
          const cc = creditCardsMap.get(line.journal_entries.source_id);
          if (cc) {
            memo = cc.memo;
            reference = cc.vendor;
            reconciled = cc.reconciled || !!cc.reconciliation_id || !!cc.reconciliation_date;
            reconciliation_date = cc.reconciliation_date;
            // Use first credit card line memo as description
            description = cc.firstLineMemo || description;
          }
        }

        // If this is a bill or bill payment, get vendor name from bills table
        if (line.journal_entries.source_type === 'bill' || line.journal_entries.source_type === 'bill_payment') {
          const bill = billsMap.get(line.journal_entries.source_id);
          if (bill) {
            reference = bill.vendor_name;
            description = bill.reference_number || description;
            reconciled = bill.reconciled || !!bill.reconciliation_id || !!bill.reconciliation_date;
            reconciliation_date = bill.reconciliation_date;
          }
        }

        return {
          source_id: line.journal_entries.source_id,
          line_id: line.id,
          journal_entry_id: line.journal_entries.id,
          date: line.journal_entries.entry_date,
          memo: memo,
          description: description,
          reference: reference,
          source_type: line.journal_entries.source_type,
          debit: line.debit || 0,
          credit: line.credit || 0,
          created_at: line.journal_entries.created_at,
          reconciled: reconciled,
          reconciliation_date: reconciliation_date,
        };
      });

      // Fully deterministic sort: date, then created_at, then journal_entry_id, then line_id
      transactions.sort((a, b) => {
        const dateA = new Date(`${a.date}T00:00:00`).getTime();
        const dateB = new Date(`${b.date}T00:00:00`).getTime();

        // Primary: date
        const dateDiff = sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        if (dateDiff !== 0) return dateDiff;

        // Secondary: created_at
        const createdA = new Date(a.created_at).getTime();
        const createdB = new Date(b.created_at).getTime();
        const createdDiff = sortOrder === 'desc' ? createdB - createdA : createdA - createdB;
        if (createdDiff !== 0) return createdDiff;

        // Tertiary: journal_entry_id (string compare)
        if (a.journal_entry_id !== b.journal_entry_id) {
          if (sortOrder === 'desc') {
            return a.journal_entry_id < b.journal_entry_id ? 1 : -1;
          } else {
            return a.journal_entry_id < b.journal_entry_id ? -1 : 1;
          }
        }

        // Quaternary: line_id (string compare)
        if (a.line_id !== b.line_id) {
          if (sortOrder === 'desc') {
            return a.line_id < b.line_id ? 1 : -1;
          } else {
            return a.line_id < b.line_id ? -1 : 1;
          }
        }

        return 0;
      });

      return transactions;
    },
    enabled: !!accountId && open,
    placeholderData: keepPreviousData,
  });

  // Auto-close dialog when all transactions are deleted
  useEffect(() => {
    if (transactions && transactions.length === 0 && open) {
      onOpenChange(false);
    }
  }, [transactions, open, onOpenChange]);

  // Refetch reports when dialog closes to ensure immediate updates
  useEffect(() => {
    if (prevOpenRef.current && !open) {
      // Dialog just closed => refresh reports and transactions
      queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["balance-sheet"] });
      queryClient.invalidateQueries({ queryKey: ["income-statement"] });

      // Force immediate refetch to ensure UI updates without waiting
      queryClient.refetchQueries({ queryKey: ["balance-sheet"] });
      queryClient.refetchQueries({ queryKey: ["income-statement"] });
    }
    prevOpenRef.current = open;
  }, [open, queryClient]);

  const handleDelete = async (transaction: Transaction) => {
    if (!canDeleteBills) return;
    
    // CRITICAL: Never allow deletion of reconciled transactions
    if (transaction.reconciled) {
      console.error('Cannot delete reconciled transaction');
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Cannot Delete",
        description: "This transaction is reconciled and cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    // CRITICAL: Never allow deletion of transactions in closed periods
    if (isDateLocked(transaction.date)) {
      console.error('Cannot delete transaction in closed period');
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Books are Closed",
        description: `This transaction is dated on or before ${latestClosedDate ? format(new Date(latestClosedDate), 'PP') : 'the closed period'} and cannot be deleted. You must reopen the accounting period first.`,
        variant: "destructive",
      });
      return;
    }

    // Compute query key for optimistic update
    const queryKey = ['account-transactions', accountId, projectId, sortOrder] as const;
    
    // Snapshot current data
    const previous = queryClient.getQueryData<Transaction[]>(queryKey);
    
    // Optimistically remove the row
    queryClient.setQueryData<Transaction[]>(queryKey, (old) => 
      (old || []).filter(t => t.line_id !== transaction.line_id)
    );

    try {
      if (transaction.source_type === 'check') {
        await deleteCheck.mutateAsync(transaction.source_id);
      } else if (transaction.source_type === 'deposit') {
        await deleteDeposit.mutateAsync(transaction.source_id);
      } else if (transaction.source_type === 'credit_card') {
        await deleteCreditCard.mutateAsync(transaction.source_id);
      } else if (transaction.source_type === 'manual') {
        await deleteManualJournalEntry.mutateAsync(transaction.journal_entry_id);
      } else if (transaction.source_type === 'bill_payment') {
        // Reverse the payment instead of deleting the bill
        const { error } = await supabase.rpc('reverse_bill_payment', {
          journal_entry_id_param: transaction.journal_entry_id
        });
        if (error) throw error;
        
        const { toast } = await import("@/hooks/use-toast");
        toast({
          title: "Payment Reversed",
          description: "The payment has been reversed and the bill balance has been restored.",
        });
      } else if (transaction.source_type === 'bill') {
        const { error } = await supabase.rpc('delete_bill_with_journal_entries', {
          bill_id_param: transaction.source_id
        });
        if (error) throw error;
      }
      
      // On success, invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ['account-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['bills-for-payment'] });
      queryClient.invalidateQueries({ queryKey: ['bill-approval-counts'] });
      queryClient.refetchQueries({ queryKey: ['account-transactions'] });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      // Roll back optimistic update on error
      queryClient.setQueryData(queryKey, previous);
      
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Error",
        description: "Failed to delete transaction. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async (
    transaction: Transaction,
    field: "date" | "reference" | "description" | "amount",
    value: string | number | Date
  ) => {
    // CRITICAL: Never allow updates to reconciled transactions
    if (transaction.reconciled) {
      console.error('Cannot update reconciled transaction');
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Cannot Edit",
        description: "This transaction is reconciled and cannot be modified.",
        variant: "destructive",
      });
      return;
    }
    
    const queryKey = ['account-transactions', accountId, projectId, sortOrder] as const;
    
    try {
      // Description is always updated on the journal entry line
      if (field === "description") {
        await updateJournalEntryLine.mutateAsync({ 
          lineId: transaction.line_id, 
          updates: { memo: value as string } 
        });
        
        // Immediately refresh the dialog and balance sheet
        await queryClient.invalidateQueries({ queryKey });
        await queryClient.refetchQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
        queryClient.refetchQueries({ queryKey: ['balance-sheet'] });
        return;
      }

      switch (transaction.source_type) {
        case 'check':
          // Fetch check to determine status
          const { data: checkData } = await supabase
            .from('checks')
            .select('*, check_lines(*)')
            .eq('id', transaction.source_id)
            .single();
          
          if (checkData && (checkData.status === 'posted' || checkData.status === 'cleared')) {
            // Use correction for posted/cleared checks
            const correctedCheckData: any = {
              check_number: checkData.check_number,
              check_date: field === "date" ? format(value as Date, "yyyy-MM-dd") : checkData.check_date,
              pay_to: field === "reference" ? value as string : checkData.pay_to,
              bank_account_id: checkData.bank_account_id,
              project_id: checkData.project_id,
              amount: field === "amount" ? value as number : checkData.amount,
              memo: checkData.memo
            };
            const correctedCheckLines = checkData.check_lines.map((line: any) => ({
              line_type: line.line_type,
              account_id: line.account_id,
              cost_code_id: line.cost_code_id,
              project_id: line.project_id,
              amount: field === "amount" ? (value as number) * (line.amount / checkData.amount) : line.amount,
              memo: line.memo
            }));
            await correctCheck.mutateAsync({ checkId: transaction.source_id, correctedCheckData, correctedCheckLines });
          } else {
            // Use update for draft checks
            const checkUpdates: any = {};
            if (field === "date") checkUpdates.check_date = format(value as Date, "yyyy-MM-dd");
            if (field === "reference") checkUpdates.pay_to = value as string;
            if (field === "amount") checkUpdates.amount = value as number;
            await updateCheck.mutateAsync({ checkId: transaction.source_id, updates: checkUpdates });
          }
          
          // Immediately refresh the dialog and balance sheet
          await queryClient.invalidateQueries({ queryKey });
          await queryClient.refetchQueries({ queryKey });
          queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
          queryClient.refetchQueries({ queryKey: ['balance-sheet'] });
          break;
        case 'deposit':
          // Fetch deposit to determine status
          const { data: depositData } = await supabase
            .from('deposits')
            .select('*, deposit_lines(*)')
            .eq('id', transaction.source_id)
            .single();
          
          if (depositData && (depositData.status === 'posted' || depositData.status === 'cleared')) {
            // Use correction for posted/cleared deposits
            const correctedDepositData: any = {
              deposit_date: field === "date" ? format(value as Date, "yyyy-MM-dd") : depositData.deposit_date,
              bank_account_id: depositData.bank_account_id,
              project_id: depositData.project_id,
              amount: field === "amount" ? value as number : depositData.amount,
              memo: field === "reference" ? value as string : depositData.memo
            };
            const correctedDepositLines = depositData.deposit_lines.map((line: any) => ({
              line_type: line.line_type,
              account_id: line.account_id,
              cost_code_id: line.cost_code_id,
              project_id: line.project_id,
              amount: field === "amount" ? (value as number) * (line.amount / depositData.amount) : line.amount,
              memo: line.memo
            }));
            await correctDeposit.mutateAsync({ depositId: transaction.source_id, correctedDepositData, correctedDepositLines });
          } else {
            // Use update for draft deposits
            const depositUpdates: any = {};
            if (field === "date") depositUpdates.deposit_date = format(value as Date, "yyyy-MM-dd");
            if (field === "reference") {
              // For deposits, "Received From" updates the memo field which is displayed as the received from
              depositUpdates.memo = value as string;
            }
            if (field === "amount") depositUpdates.amount = value as number;
            await updateDeposit.mutateAsync({ depositId: transaction.source_id, updates: depositUpdates });
          }
          
          // Immediately refresh the dialog and balance sheet
          await queryClient.invalidateQueries({ queryKey });
          await queryClient.refetchQueries({ queryKey });
          queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
          queryClient.refetchQueries({ queryKey: ['balance-sheet'] });
          break;
        case 'manual':
          const journalUpdates: any = {};
          if (field === "date") journalUpdates.entry_date = format(value as Date, "yyyy-MM-dd");
          await updateJournalEntryField.mutateAsync({ entryId: transaction.source_id, updates: journalUpdates });
          
          // Immediately refresh the dialog and balance sheet
          await queryClient.invalidateQueries({ queryKey });
          await queryClient.refetchQueries({ queryKey });
          queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
          queryClient.refetchQueries({ queryKey: ['balance-sheet'] });
          break;
        default:
          console.log('Edit not implemented for:', transaction.source_type);
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatAmountWithSign = (amount: number) => {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(absAmount);
    
    if (amount < 0) {
      return <span className="text-red-600">({formatted})</span>;
    }
    return formatted;
  };

  const calculateRunningBalance = (transactions: Transaction[]) => {
    let balance = 0;
    return transactions.map((txn) => {
      // For assets and expenses: debit increases, credit decreases
      // For liabilities, equity, revenue: credit increases, debit decreases
      if (accountType === 'asset' || accountType === 'expense') {
        balance += txn.debit - txn.credit;
      } else {
        balance += txn.credit - txn.debit;
      }
      return balance;
    });
  };

  const balances = transactions ? calculateRunningBalance(transactions) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {accountCode} - {accountName}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found for this account.
            </div>
          ) : (
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="h-8 px-2 py-1">Date</TableHead>
                  <TableHead className="h-8 px-2 py-1">Received From</TableHead>
              <TableHead className="h-8 px-2 py-1">Description</TableHead>
              <TableHead className="h-8 px-2 py-1">Amount</TableHead>
              <TableHead className="h-8 px-2 py-1">Balance</TableHead>
              <TableHead className="h-8 px-2 py-1 text-center">Cleared</TableHead>
              <TableHead className="h-8 px-2 py-1 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn, index) => (
                  <TableRow key={txn.line_id} className="h-8">
                    <TableCell className="px-2 py-1">
                  <AccountTransactionInlineEditor
                    value={toLocalDate(txn.date)}
                    field="date"
                    onSave={(value) => handleUpdate(txn, "date", value)}
                    readOnly={!canDeleteBills || txn.reconciled}
                  />
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <AccountTransactionInlineEditor
                        value={txn.reference || '-'}
                        field="reference"
                        onSave={(value) => handleUpdate(txn, "reference", value)}
                        readOnly={!canDeleteBills || txn.reconciled || !['check', 'deposit'].includes(txn.source_type)}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <AccountTransactionInlineEditor
                        value={txn.description || '-'}
                        field="description"
                        onSave={(value) => handleUpdate(txn, "description", value)}
                        readOnly={!canDeleteBills || txn.reconciled}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <AccountTransactionInlineEditor
                        value={txn.credit > 0 ? txn.credit : txn.debit}
                        field="amount"
                        onSave={(value) => handleUpdate(txn, "amount", value)}
                        readOnly={!canDeleteBills || txn.reconciled}
                        isNegative={
                          (accountType === 'asset' || accountType === 'expense') 
                            ? txn.credit > 0 
                            : txn.debit > 0
                        }
                      />
                    </TableCell>
                    <TableCell className="px-2 py-1 font-medium">
                      {formatAmountWithSign(balances[index])}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-center">
                              {txn.reconciled && <Check className="h-4 w-4 text-green-600 mx-auto" />}
                            </div>
                          </TooltipTrigger>
                          {txn.reconciled && txn.reconciliation_date && (
                            <TooltipContent>
                              <p className="text-xs">Reconciled on {format(new Date(txn.reconciliation_date), "MM/dd/yyyy")}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-center">
                              {canDeleteBills && !txn.reconciled && !isDateLocked(txn.date) && (
                                <DeleteButton
                                  onDelete={() => handleDelete(txn)}
                                  title="Delete Transaction"
                                  description={`Are you sure you want to delete this ${txn.source_type} transaction? This will remove all related journal entries and cannot be undone.`}
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                />
                              )}
                              {(txn.reconciled || isDateLocked(txn.date)) && (
                                <span className="text-muted-foreground text-lg">🔒</span>
                              )}
                            </div>
                          </TooltipTrigger>
                          {txn.reconciled && (
                            <TooltipContent>
                              <p className="text-xs">Cannot delete reconciled transaction</p>
                            </TooltipContent>
                          )}
                          {!txn.reconciled && isDateLocked(txn.date) && (
                            <TooltipContent>
                              <p className="text-xs">Books are closed - cannot delete transactions dated on or before {latestClosedDate ? format(new Date(latestClosedDate), 'PP') : 'the closed period'}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
