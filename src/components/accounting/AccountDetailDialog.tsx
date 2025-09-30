import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

interface Transaction {
  date: string;
  memo: string | null;
  payee: string | null;
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

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['account-transactions', accountId, projectId, sortOrder],
    queryFn: async (): Promise<Transaction[]> => {
      if (!accountId) return [];

      let query = supabase
        .from('journal_entry_lines')
        .select(`
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

      // Fetch check details if we have any checks
      let checksMap = new Map();
      if (checkIds.length > 0) {
        const { data: checksData } = await supabase
          .from('checks')
          .select('id, memo, pay_to')
          .in('id', checkIds);
        
        checksData?.forEach(check => {
          checksMap.set(check.id, check);
        });
      }

      const transactions: Transaction[] = (data || []).map((line: any) => {
        let memo = line.memo;
        let payee = null;

        // If this is a check, get memo and payee from checks table
        if (line.journal_entries.source_type === 'check') {
          const check = checksMap.get(line.journal_entries.source_id);
          if (check) {
            memo = check.memo;
            payee = check.pay_to;
          }
        }

        return {
          date: line.journal_entries.entry_date,
          memo: memo,
          payee: payee,
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
          <p className="text-sm text-muted-foreground">
            Account Type: {accountType.charAt(0).toUpperCase() + accountType.slice(1)}
          </p>
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
                  <TableHead>Memo</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn, index) => (
                  <TableRow key={index}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(txn.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        {txn.payee && (
                          <div className="font-medium">
                            Check to {txn.payee}
                          </div>
                        )}
                        {txn.memo && (
                          <div className={txn.payee ? "text-xs text-muted-foreground" : "font-medium"}>
                            {txn.memo}
                          </div>
                        )}
                        {!txn.memo && !txn.payee && (
                          <div className="text-muted-foreground">-</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {txn.debit > 0 ? formatCurrency(txn.debit) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {txn.credit > 0 ? formatCurrency(txn.credit) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(balances[index])}
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
