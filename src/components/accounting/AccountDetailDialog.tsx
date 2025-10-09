import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

interface Transaction {
  source_id: string;
  line_id: string;
  date: string;
  memo: string | null;
  vendor: string | null;
  description: string | null;
  reference: string | null;
  source_type: string;
  debit: number;
  credit: number;
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

  const { data: transactions, isLoading } = useQuery({
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
          journal_entries!inner(
            entry_date,
            description,
            source_type,
            source_id
          )
        `)
        .eq('account_id', accountId);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

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
            check_number
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
            deposit_source_id,
            deposit_sources(customer_name)
          `)
          .in('id', depositIds);
        
        depositsData?.forEach((deposit: any) => {
          depositsMap.set(deposit.id, {
            ...deposit,
            customer_name: deposit.deposit_sources?.customer_name || null
          });
        });
      }

      const transactions: Transaction[] = (data || []).map((line: any) => {
        let memo = line.memo;
        let vendor = null;
        let reference = null;
        let description = line.memo; // Description always comes from the line memo

        // If this is a check, get vendor details and reference from checks table
        if (line.journal_entries.source_type === 'check') {
          const check = checksMap.get(line.journal_entries.source_id);
          if (check) {
            memo = check.memo;
            vendor = check.vendor_name;
            reference = check.check_number;
          }
        }

        // If this is a deposit, get customer details and reference from deposits table
        if (line.journal_entries.source_type === 'deposit') {
          const deposit = depositsMap.get(line.journal_entries.source_id);
          if (deposit) {
            memo = deposit.memo;
            vendor = deposit.customer_name || 'Cash';
            reference = deposit.memo; // Reference for deposits is the memo field
          }
        }

        return {
          source_id: line.journal_entries.source_id,
          line_id: line.id, // Journal entry line ID
          date: line.journal_entries.entry_date,
          memo: memo,
          vendor: vendor,
          description: description,
          reference: reference,
          source_type: line.journal_entries.source_type,
          debit: line.debit || 0,
          credit: line.credit || 0,
        };
      });

      // Sort by date
      transactions.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });

      return transactions;
    },
    enabled: !!accountId && open,
  });

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
    field: "date" | "reference" | "vendor" | "description" | "amount",
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
          if (field === "reference") checkUpdates.check_number = value as string;
          if (field === "vendor") checkUpdates.pay_to = value as string;
          if (field === "amount") checkUpdates.amount = value as number;
          await updateCheck.mutateAsync({ checkId: transaction.source_id, updates: checkUpdates });
          break;
        case 'deposit':
          const depositUpdates: any = {};
          if (field === "date") depositUpdates.deposit_date = format(value as Date, "yyyy-MM-dd");
          if (field === "reference") depositUpdates.memo = value as string; // Reference for deposits
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
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <AccountTransactionInlineEditor
                        value={new Date(txn.date)}
                        field="date"
                        onSave={(value) => handleUpdate(txn, "date", value)}
                        readOnly={!canDeleteBills}
                      />
                    </TableCell>
                    <TableCell>
                      <AccountTransactionInlineEditor
                        value={txn.reference || '-'}
                        field="reference"
                        onSave={(value) => handleUpdate(txn, "reference", value)}
                        readOnly={!canDeleteBills || !['check', 'deposit'].includes(txn.source_type)}
                      />
                    </TableCell>
                    <TableCell>
                      <AccountTransactionInlineEditor
                        value={txn.vendor || '-'}
                        field="vendor"
                        onSave={(value) => handleUpdate(txn, "vendor", value)}
                        readOnly={!canDeleteBills || txn.source_type !== 'check'}
                      />
                    </TableCell>
                    <TableCell>
                      <AccountTransactionInlineEditor
                        value={txn.description || '-'}
                        field="description"
                        onSave={(value) => handleUpdate(txn, "description", value)}
                        readOnly={!canDeleteBills}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {txn.credit > 0 
                        ? `(${formatCurrency(txn.credit)})` 
                        : txn.debit > 0 
                        ? formatCurrency(txn.debit) 
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(balances[index])}
                    </TableCell>
                    <TableCell className="text-right">
                      {canDeleteBills && (
                        <DeleteButton
                          onDelete={() => handleDelete(txn)}
                          title="Delete Transaction"
                          description={`Are you sure you want to delete this ${txn.source_type} transaction? This will remove all related journal entries and cannot be undone.`}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
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
