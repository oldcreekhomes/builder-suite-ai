import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { formatDateSafe } from "@/utils/dateOnly";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ReconciliationReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reconciliation: {
    id: string;
    statement_date: string;
    statement_beginning_balance: number;
    statement_ending_balance: number;
    notes?: string;
  } | null;
  bankAccountId: string | null;
}

interface ClearedTransaction {
  id: string;
  date: string;
  payee: string;
  reference?: string;
  amount: number;
  type: 'check' | 'deposit' | 'bill_payment' | 'journal_entry';
}

export function ReconciliationReviewDialog({
  open,
  onOpenChange,
  reconciliation,
  bankAccountId,
}: ReconciliationReviewDialogProps) {
  const reconciliationId = reconciliation?.id;

  // Fetch all transactions linked to this reconciliation
  const { data, isLoading } = useQuery({
    queryKey: ['reconciliation-transactions-by-id', reconciliationId],
    queryFn: async () => {
      if (!reconciliationId || !bankAccountId) {
        return { checks: [], deposits: [], billPayments: [], journalEntries: [] };
      }

      // Fetch checks
      const { data: checks } = await supabase
        .from('checks')
        .select('id, check_date, pay_to, amount, check_number')
        .eq('reconciliation_id', reconciliationId);

      // Fetch deposits
      const { data: deposits } = await supabase
        .from('deposits')
        .select('id, deposit_date, memo, amount, company_name')
        .eq('reconciliation_id', reconciliationId);

      // Fetch bills (bill payments)
      const { data: bills } = await supabase
        .from('bills')
        .select('id, reference_number, vendor_id, reconciliation_date')
        .eq('reconciliation_id', reconciliationId);

      // For bill payments, get the journal entries to find the payment amounts
      let billPayments: ClearedTransaction[] = [];
      if (bills && bills.length > 0) {
        const billIds = bills.map(b => b.id);
        
        // Get vendor names
        const vendorIds = [...new Set(bills.map(b => b.vendor_id))];
        const { data: vendors } = await supabase
          .from('companies')
          .select('id, company_name')
          .in('id', vendorIds);
        const vendorMap = new Map((vendors || []).map(v => [v.id, v.company_name]));

        // Get journal entries for these bills to find payment amounts
        const { data: journalEntries } = await supabase
          .from('journal_entries')
          .select('id, entry_date, source_id')
          .eq('source_type', 'bill_payment')
          .in('source_id', billIds);

        if (journalEntries && journalEntries.length > 0) {
          const jeIds = journalEntries.map(je => je.id);
          
          // Get the credit amounts from journal lines for the bank account
          const { data: journalLines } = await supabase
            .from('journal_entry_lines')
            .select('journal_entry_id, credit')
            .in('journal_entry_id', jeIds)
            .eq('account_id', bankAccountId)
            .gt('credit', 0);

          // Aggregate amounts per bill
          const billToAmount = new Map<string, number>();
          const billToDate = new Map<string, string>();
          
          journalEntries.forEach(je => {
            const lines = (journalLines || []).filter(l => l.journal_entry_id === je.id);
            const total = lines.reduce((sum, l) => sum + Number(l.credit), 0);
            const existing = billToAmount.get(je.source_id) || 0;
            billToAmount.set(je.source_id, existing + total);
            
            const existingDate = billToDate.get(je.source_id);
            if (!existingDate || je.entry_date > existingDate) {
              billToDate.set(je.source_id, je.entry_date);
            }
          });

          billPayments = bills.map(bill => ({
            id: bill.id,
            date: billToDate.get(bill.id) || '',
            payee: vendorMap.get(bill.vendor_id) || 'Unknown Vendor',
            reference: bill.reference_number || undefined,
            amount: billToAmount.get(bill.id) || 0,
            type: 'bill_payment' as const,
          })).filter(bp => bp.amount > 0);
        }
      }

      // Fetch manual journal entry lines reconciled to this reconciliation
      const { data: jeLines } = await supabase
        .from('journal_entry_lines')
        .select(`
          id,
          debit,
          credit,
          memo,
          journal_entry_id,
          journal_entries!inner (
            id,
            entry_date,
            description,
            source_type
          )
        `)
        .eq('reconciliation_id', reconciliationId)
        .eq('account_id', bankAccountId);

      const journalEntryTransactions: ClearedTransaction[] = (jeLines || [])
        .filter((line: any) => line.journal_entries?.source_type === 'manual')
        .map((line: any) => ({
          id: line.id,
          date: line.journal_entries?.entry_date || '',
          payee: line.memo || line.journal_entries?.description || 'Manual Journal Entry',
          amount: Number(line.debit) > 0 ? Number(line.debit) : -Number(line.credit),
          type: 'journal_entry' as const,
        }));

      return {
        checks: (checks || []).map(c => ({
          id: c.id,
          date: c.check_date,
          payee: c.pay_to,
          reference: c.check_number || undefined,
          amount: c.amount,
          type: 'check' as const,
        })),
        deposits: (deposits || []).map(d => ({
          id: d.id,
          date: d.deposit_date,
          payee: d.company_name || d.memo || 'Deposit',
          amount: d.amount,
          type: 'deposit' as const,
        })),
        billPayments,
        journalEntries: journalEntryTransactions,
      };
    },
    enabled: open && !!reconciliationId && !!bankAccountId,
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  // Combine checks, bill payments, and journal entry debits
  const allDebits = [
    ...(data?.checks || []),
    ...(data?.billPayments || []),
    ...(data?.journalEntries || []).filter(je => je.amount > 0),
  ].sort((a, b) => a.date.localeCompare(b.date));

  // Combine deposits and journal entry credits
  const allCredits = [
    ...(data?.deposits || []),
    ...(data?.journalEntries || []).filter(je => je.amount < 0).map(je => ({
      ...je,
      amount: Math.abs(je.amount),
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const totalDebits = allDebits.reduce((sum, t) => sum + t.amount, 0);
  const totalCredits = allCredits.reduce((sum, t) => sum + t.amount, 0);

  const beginningBalance = reconciliation?.statement_beginning_balance || 0;
  const endingBalance = reconciliation?.statement_ending_balance || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Reconciliation Review
            {reconciliation && (
              <span className="text-muted-foreground font-normal ml-2">
                - {formatDateSafe(reconciliation.statement_date, "MMMM yyyy")}
              </span>
            )}
          </DialogTitle>
          {reconciliation && (
            <div className="flex gap-6 text-sm text-muted-foreground mt-2">
              <div>
                <span className="font-medium">Statement Date:</span>{" "}
                {formatDateSafe(reconciliation.statement_date, "MM/dd/yyyy")}
              </div>
              <div>
                <span className="font-medium">Beginning:</span>{" "}
                {formatCurrency(beginningBalance)}
              </div>
              <div>
                <span className="font-medium">Ending:</span>{" "}
                {formatCurrency(endingBalance)}
              </div>
            </div>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <ScrollArea type="always" className="h-full pr-4">
              <div className="space-y-6 pb-6">
                {/* Checks & Bill Payments (Debits) */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-base">Checks & Bill Payments Cleared</h3>
                    <span className="text-sm font-medium text-destructive">
                      Total: {formatCurrency(totalDebits)}
                    </span>
                  </div>
                  {allDebits.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No checks or bill payments in this reconciliation</p>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2 text-left">Date</th>
                            <th className="p-2 text-left">Type</th>
                            <th className="p-2 text-left">Payee</th>
                            <th className="p-2 text-left">Reference</th>
                            <th className="p-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allDebits.map((t) => (
                            <tr key={t.id} className="border-t">
                              <td className="p-2">
                               {t.date ? formatDateSafe(t.date, "MM/dd/yyyy") : '-'}
                              </td>
                              <td className="p-2 capitalize">
                                {t.type === 'bill_payment' ? 'Bill Payment' :
                                 t.type === 'journal_entry' ? 'Journal Entry' : 'Check'}
                              </td>
                              <td className="p-2">{t.payee}</td>
                              <td className="p-2">{t.reference || '-'}</td>
                              <td className="p-2 text-right text-destructive font-medium">
                                ({formatCurrency(t.amount)})
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Deposits (Credits) */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-base">Deposits Cleared</h3>
                    <span className="text-sm font-medium text-green-600">
                      Total: {formatCurrency(totalCredits)}
                    </span>
                  </div>
                  {allCredits.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No deposits in this reconciliation</p>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2 text-left">Date</th>
                            <th className="p-2 text-left">Type</th>
                            <th className="p-2 text-left">Source</th>
                            <th className="p-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allCredits.map((t) => (
                            <tr key={t.id} className="border-t">
                              <td className="p-2">
                                {t.date ? formatDateSafe(t.date, "MM/dd/yyyy") : '-'}
                              </td>
                              <td className="p-2">
                                {t.type === 'journal_entry' ? 'Journal Entry' : 'Deposit'}
                              </td>
                              <td className="p-2">{t.payee}</td>
                              <td className="p-2 text-right text-green-600 font-medium">
                                {formatCurrency(t.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Summary */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="font-semibold text-base mb-3">Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Beginning Balance:</span>
                      <span className="font-medium">{formatCurrency(beginningBalance)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>+ Deposits Cleared:</span>
                      <span className="font-medium">+{formatCurrency(totalCredits)}</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>- Checks & Bill Payments Cleared:</span>
                      <span className="font-medium">-{formatCurrency(totalDebits)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold text-base">
                      <span>= Ending Balance:</span>
                      <span>{formatCurrency(beginningBalance + totalCredits - totalDebits)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Statement Ending Balance:</span>
                      <span>{formatCurrency(endingBalance)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
