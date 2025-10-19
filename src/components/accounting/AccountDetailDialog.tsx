import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
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
import { useJournalEntries } from "@/hooks/useJournalEntries";
import { useUserRole } from "@/hooks/useUserRole";
import { AccountTransactionInlineEditor } from "./AccountTransactionInlineEditor";
import { Check } from "lucide-react";

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
}

interface AccountDetailDialogProps {
  accountId: string | null;
  accountCode: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  projectId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountDetailDialog({
  accountId,
  accountCode,
  accountName,
  accountType,
  projectId,
  open,
  onOpenChange,
}: AccountDetailDialogProps) {
  const [sortOrder] = useState<'asc' | 'desc'>('desc');
  const { deleteCheck, updateCheck } = useChecks();
  const { deleteDeposit, updateDeposit } = useDeposits();
  const { deleteManualJournalEntry, updateJournalEntryField, updateJournalEntryLine } = useJournalEntries();
  const { canDeleteBills } = useUserRole();

  // Helper to parse date-only strings as local midnight (avoids timezone shift)
  const toLocalDate = (dateStr: string) => new Date(`${dateStr}T00:00:00`);

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ['account-transactions', accountId, projectId, sortOrder],
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
          created_at
        )
        `)
        .eq('account_id', accountId);

      if (projectId) {
        query = query.eq('project_id', projectId);
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
            reconciled
          `)
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
          
          checksMap.set(check.id, {
            ...check,
            vendor_name: vendorName
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
            deposit_sources(customer_name),
            deposit_lines(memo, line_number)
          `)
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

      const transactions: Transaction[] = (data || []).map((line: any) => {
        let memo = line.memo;
        let reference = null;
        let description = line.memo; // Description always comes from the line memo
        let reconciled = false;

        // If this is a check, get reference from checks table
        if (line.journal_entries.source_type === 'check') {
          const check = checksMap.get(line.journal_entries.source_id);
          if (check) {
            memo = check.memo;
            reference = check.vendor_name || check.pay_to;
            reconciled = check.reconciled || false;
          }
        }

        // If this is a deposit, get reference from deposits table
        if (line.journal_entries.source_type === 'deposit') {
          const deposit = depositsMap.get(line.journal_entries.source_id);
          if (deposit) {
            memo = deposit.memo;
            reference = deposit.receivedFrom;
            reconciled = deposit.reconciled || false;
            
            // For the bank line, use the first deposit line memo as description
            if (line.account_id === deposit.bank_account_id) {
              description = deposit.firstLineMemo || line.memo;
            }
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

  const handleDelete = async (transaction: Transaction) => {
    if (!canDeleteBills) return;

    try {
      if (transaction.source_type === 'check') {
        await deleteCheck.mutateAsync(transaction.source_id);
      } else if (transaction.source_type === 'deposit') {
        await deleteDeposit.mutateAsync(transaction.source_id);
      } else if (transaction.source_type === 'manual') {
        await deleteManualJournalEntry.mutateAsync(transaction.source_id);
      } else if (transaction.source_type === 'bill' || transaction.source_type === 'bill_payment') {
        const { error } = await supabase.rpc('delete_bill_with_journal_entries', {
          bill_id_param: transaction.source_id
        });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleUpdate = async (
    transaction: Transaction,
    field: "date" | "reference" | "description" | "amount",
    value: string | number | Date
  ) => {
    try {
      // Description is always updated on the journal entry line
      if (field === "description") {
        await updateJournalEntryLine.mutateAsync({ 
          lineId: transaction.line_id, 
          updates: { memo: value as string } 
        });
        return;
      }

      switch (transaction.source_type) {
        case 'check':
          const checkUpdates: any = {};
          if (field === "date") checkUpdates.check_date = format(value as Date, "yyyy-MM-dd");
          if (field === "reference") checkUpdates.pay_to = value as string;
          if (field === "amount") checkUpdates.amount = value as number;
          await updateCheck.mutateAsync({ checkId: transaction.source_id, updates: checkUpdates });
          break;
        case 'deposit':
          const depositUpdates: any = {};
          if (field === "date") depositUpdates.deposit_date = format(value as Date, "yyyy-MM-dd");
          if (field === "reference") {
            // For deposits, "Received From" updates the memo field which is displayed as the received from
            depositUpdates.memo = value as string;
          }
          if (field === "amount") depositUpdates.amount = value as number;
          await updateDeposit.mutateAsync({ depositId: transaction.source_id, updates: depositUpdates });
          break;
        case 'manual':
          const journalUpdates: any = {};
          if (field === "date") journalUpdates.entry_date = format(value as Date, "yyyy-MM-dd");
          await updateJournalEntryField.mutateAsync({ entryId: transaction.source_id, updates: journalUpdates });
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
                    readOnly={!canDeleteBills}
                  />
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <AccountTransactionInlineEditor
                        value={txn.reference || '-'}
                        field="reference"
                        onSave={(value) => handleUpdate(txn, "reference", value)}
                        readOnly={!canDeleteBills || !['check', 'deposit'].includes(txn.source_type)}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <AccountTransactionInlineEditor
                        value={txn.description || '-'}
                        field="description"
                        onSave={(value) => handleUpdate(txn, "description", value)}
                        readOnly={!canDeleteBills}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      {txn.credit > 0 
                        ? `(${formatCurrency(txn.credit)})` 
                        : txn.debit > 0 
                        ? formatCurrency(txn.debit) 
                        : '-'}
                    </TableCell>
                    <TableCell className="px-2 py-1 font-medium">
                      {formatCurrency(balances[index])}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-center">
                      {txn.reconciled && <Check className="h-4 w-4 text-green-600 mx-auto" />}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-center">
                      {canDeleteBills && !txn.reconciled && (
                        <DeleteButton
                          onDelete={() => handleDelete(txn)}
                          title="Delete Transaction"
                          description={`Are you sure you want to delete this ${txn.source_type} transaction? This will remove all related journal entries and cannot be undone.`}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                        />
                      )}
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
