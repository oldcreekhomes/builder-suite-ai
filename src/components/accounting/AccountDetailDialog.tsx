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

      // Fetch check details with vendor names if we have any checks
      let checksMap = new Map();
      let checkLinesMap = new Map();
      
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
        
        // Fetch check lines to get descriptions
        const { data: checkLinesData } = await supabase
          .from('check_lines')
          .select('check_id, memo, line_number')
          .in('check_id', checkIds)
          .order('line_number', { ascending: true });
        
        // Group check lines by check_id
        checkLinesData?.forEach((line: any) => {
          if (!checkLinesMap.has(line.check_id)) {
            checkLinesMap.set(line.check_id, []);
          }
          checkLinesMap.get(line.check_id).push(line.memo);
        });
        
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

      const transactions: Transaction[] = (data || []).map((line: any) => {
        let memo = line.memo;
        let vendor = null;
        let reference = null;
        let description = null;

        // If this is a check, get vendor details and descriptions from checks table
        if (line.journal_entries.source_type === 'check') {
          const check = checksMap.get(line.journal_entries.source_id);
          if (check) {
            memo = check.memo;
            vendor = check.vendor_name;
            reference = check.check_number;
            
            // Get descriptions from check_lines
            const checkLineMemos = checkLinesMap.get(line.journal_entries.source_id);
            if (checkLineMemos && checkLineMemos.length > 0) {
              // Join all line memos with semicolons if multiple lines
              description = checkLineMemos.filter((m: string) => m).join('; ');
            }
          }
        }

        return {
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn, index) => (
                  <TableRow key={index}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(txn.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {txn.reference || '-'}
                    </TableCell>
                    <TableCell>
                      {txn.vendor || '-'}
                    </TableCell>
                    <TableCell>
                      {txn.description || '-'}
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
