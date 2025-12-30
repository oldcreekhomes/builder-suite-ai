import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface TransactionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    date: string;
    type: 'check' | 'deposit' | 'bill_payment' | 'journal_entry';
    reference_number?: string;
    payee?: string;
    source?: string;
    amount: number;
    memo?: string;
  } | null;
}

interface LineItem {
  id: string;
  amount: number;
  memo: string | null;
  account_name: string | null;
  lot_name: string | null;
  project_name: string | null;
  cost_code_name: string | null;
}

export function TransactionDetailDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionDetailDialogProps) {
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !transaction) {
      setLineItems([]);
      return;
    }

    const fetchLineItems = async () => {
      setIsLoading(true);
      try {
        if (transaction.type === 'check' || transaction.type === 'bill_payment') {
          const { data, error } = await supabase
            .from('check_lines')
            .select(`
              id,
              amount,
              memo,
              account_id,
              lot_id,
              project_id,
              cost_code_id
            `)
            .eq('check_id', transaction.id);

          if (error) throw error;

          // Fetch related names
          const lineItemsWithNames = await Promise.all(
            (data || []).map(async (line) => {
              let account_name = null;
              let lot_name = null;
              let project_name = null;
              let cost_code_name = null;

              if (line.account_id) {
                const { data: account } = await supabase
                  .from('accounts')
                  .select('name, code')
                  .eq('id', line.account_id)
                  .single();
                account_name = account ? `${account.code} - ${account.name}` : null;
              }

              if (line.lot_id) {
                const { data: lot } = await supabase
                  .from('project_lots')
                  .select('lot_number')
                  .eq('id', line.lot_id)
                  .single();
                lot_name = lot?.lot_number || null;
              }

              if (line.project_id) {
                const { data: project } = await supabase
                  .from('projects')
                  .select('address')
                  .eq('id', line.project_id)
                  .single();
                project_name = project?.address || null;
              }

              if (line.cost_code_id) {
                const { data: costCode } = await supabase
                  .from('cost_codes')
                  .select('code, name')
                  .eq('id', line.cost_code_id)
                  .single();
                cost_code_name = costCode ? `${costCode.code} - ${costCode.name}` : null;
              }

              return {
                id: line.id,
                amount: line.amount,
                memo: line.memo,
                account_name,
                lot_name,
                project_name,
                cost_code_name,
              };
            })
          );

          setLineItems(lineItemsWithNames);
        } else if (transaction.type === 'deposit') {
          const { data, error } = await supabase
            .from('deposit_lines')
            .select(`
              id,
              amount,
              memo,
              account_id,
              lot_id,
              project_id
            `)
            .eq('deposit_id', transaction.id);

          if (error) throw error;

          // Fetch related names
          const lineItemsWithNames = await Promise.all(
            (data || []).map(async (line) => {
              let account_name = null;
              let lot_name = null;
              let project_name = null;

              if (line.account_id) {
                const { data: account } = await supabase
                  .from('accounts')
                  .select('name, code')
                  .eq('id', line.account_id)
                  .single();
                account_name = account ? `${account.code} - ${account.name}` : null;
              }

              if (line.lot_id) {
                const { data: lot } = await supabase
                  .from('project_lots')
                  .select('lot_number')
                  .eq('id', line.lot_id)
                  .single();
                lot_name = lot?.lot_number || null;
              }

              if (line.project_id) {
                const { data: project } = await supabase
                  .from('projects')
                  .select('address')
                  .eq('id', line.project_id)
                  .single();
                project_name = project?.address || null;
              }

              return {
                id: line.id,
                amount: line.amount,
                memo: line.memo,
                account_name,
                lot_name,
                project_name,
                cost_code_name: null,
              };
            })
          );

          setLineItems(lineItemsWithNames);
        } else if (transaction.type === 'journal_entry') {
          // For journal entries, we need to get the journal_entry_lines
          const { data: jeData, error: jeError } = await supabase
            .from('journal_entries')
            .select('id')
            .eq('source_id', transaction.id)
            .eq('source_type', 'journal_entry')
            .single();

          if (jeError || !jeData) {
            setLineItems([]);
            return;
          }

          const { data, error } = await supabase
            .from('journal_entry_lines')
            .select(`
              id,
              debit,
              credit,
              memo,
              account_id,
              lot_id,
              project_id,
              cost_code_id
            `)
            .eq('journal_entry_id', jeData.id);

          if (error) throw error;

          // Fetch related names
          const lineItemsWithNames = await Promise.all(
            (data || []).map(async (line) => {
              let account_name = null;
              let lot_name = null;
              let project_name = null;
              let cost_code_name = null;

              if (line.account_id) {
                const { data: account } = await supabase
                  .from('accounts')
                  .select('name, code')
                  .eq('id', line.account_id)
                  .single();
                account_name = account ? `${account.code} - ${account.name}` : null;
              }

              if (line.lot_id) {
                const { data: lot } = await supabase
                  .from('project_lots')
                  .select('lot_number')
                  .eq('id', line.lot_id)
                  .single();
                lot_name = lot?.lot_number || null;
              }

              if (line.project_id) {
                const { data: project } = await supabase
                  .from('projects')
                  .select('address')
                  .eq('id', line.project_id)
                  .single();
                project_name = project?.address || null;
              }

              if (line.cost_code_id) {
                const { data: costCode } = await supabase
                  .from('cost_codes')
                  .select('code, name')
                  .eq('id', line.cost_code_id)
                  .single();
                cost_code_name = costCode ? `${costCode.code} - ${costCode.name}` : null;
              }

              return {
                id: line.id,
                amount: line.debit > 0 ? line.debit : -line.credit,
                memo: line.memo,
                account_name,
                lot_name,
                project_name,
                cost_code_name,
              };
            })
          );

          setLineItems(lineItemsWithNames);
        }
      } catch (error) {
        console.error('Error fetching line items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLineItems();
  }, [open, transaction]);

  if (!transaction) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bill_payment':
        return 'Bill Payment';
      case 'journal_entry':
        return 'Journal Entry';
      case 'check':
        return 'Check';
      case 'deposit':
        return 'Deposit';
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Date:</span>
              <p className="font-medium">
                {format(new Date(transaction.date + "T12:00:00"), "MM/dd/yyyy")}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Type:</span>
              <p className="font-medium">{getTypeLabel(transaction.type)}</p>
            </div>
            {transaction.reference_number && (
              <div>
                <span className="text-muted-foreground">Reference #:</span>
                <p className="font-medium">{transaction.reference_number}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">
                {transaction.type === 'deposit' ? 'Source:' : 'Payee:'}
              </span>
              <p className="font-medium">
                {transaction.payee || transaction.source || '-'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Amount:</span>
              <p className="font-medium">{formatCurrency(transaction.amount)}</p>
            </div>
            {transaction.memo && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Memo:</span>
                <p className="font-medium">{transaction.memo}</p>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-3">Line Items</h4>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : lineItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">No line items found.</p>
            ) : (
              <div className="space-y-3">
                {lineItems.map((line, index) => (
                  <div key={line.id} className="border rounded-lg p-3 text-sm space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Line {index + 1}</span>
                      <span className="font-medium">{formatCurrency(line.amount)}</span>
                    </div>
                    {line.account_name && (
                      <div>
                        <span className="text-muted-foreground">Account: </span>
                        <span>{line.account_name}</span>
                      </div>
                    )}
                    {line.project_name && (
                      <div>
                        <span className="text-muted-foreground">Project: </span>
                        <span>{line.project_name}</span>
                      </div>
                    )}
                    {line.lot_name && (
                      <div>
                        <span className="text-muted-foreground">Lot: </span>
                        <span>{line.lot_name}</span>
                      </div>
                    )}
                    {line.cost_code_name && (
                      <div>
                        <span className="text-muted-foreground">Cost Code: </span>
                        <span>{line.cost_code_name}</span>
                      </div>
                    )}
                    {line.memo && (
                      <div>
                        <span className="text-muted-foreground">Memo: </span>
                        <span>{line.memo}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
