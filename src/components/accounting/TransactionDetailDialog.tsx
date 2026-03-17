import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Check, FileText, Loader2 } from "lucide-react";
import { formatDateSafe } from "@/utils/dateOnly";
import { useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";

interface Transaction {
  source_id: string;
  line_id: string;
  journal_entry_id: string;
  date: string;
  memo: string | null;
  description: string | null;
  reference: string | null;
  accountDisplay: string | null;
  source_type: string;
  debit: number;
  credit: number;
  created_at: string;
  reconciled: boolean;
  reconciliation_date?: string | null;
  isPaid?: boolean;
  includedBillPayments?: any[];
  consolidatedTotalAmount?: number;
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  content_type: string | null;
  file_size: number;
}

interface TransactionDetailDialogProps {
  transaction: Transaction | null;
  balance: number;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getTypeLabel = (sourceType: string) => {
  switch (sourceType) {
    case 'bill': return 'Bill';
    case 'bill_payment': return 'Bill Pmt - Check';
    case 'consolidated_bill_payment': return 'Bill Pmt - Check';
    case 'check': return 'Check';
    case 'deposit': return 'Deposit';
    case 'credit_card': return 'Credit Card';
    case 'manual': return 'Journal Entry';
    default: return sourceType;
  }
};

export function TransactionDetailDialog({
  transaction,
  balance,
  accountType,
  open,
  onOpenChange,
}: TransactionDetailDialogProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const filePreview = useUniversalFilePreviewContext();

  useEffect(() => {
    if (!transaction || !open) {
      setAttachments([]);
      return;
    }

    const fetchAttachments = async () => {
      setLoadingAttachments(true);
      try {
        let data: Attachment[] = [];
        const sourceType = transaction.source_type;
        const sourceId = transaction.source_id;

        if (sourceType === 'bill' || sourceType === 'bill_payment' || sourceType === 'consolidated_bill_payment') {
          const { data: rows } = await supabase
            .from('bill_attachments')
            .select('id, file_name, file_path, content_type, file_size')
            .eq('bill_id', sourceId);
          data = rows || [];
        } else if (sourceType === 'check') {
          const { data: rows } = await supabase
            .from('check_attachments')
            .select('id, file_name, file_path, content_type, file_size')
            .eq('check_id', sourceId);
          data = rows || [];
        } else if (sourceType === 'deposit') {
          const { data: rows } = await supabase
            .from('deposit_attachments')
            .select('id, file_name, file_path, content_type, file_size')
            .eq('deposit_id', sourceId);
          data = rows || [];
        } else if (sourceType === 'credit_card') {
          const { data: rows } = await supabase
            .from('credit_card_attachments')
            .select('id, file_name, file_path, content_type, file_size')
            .eq('credit_card_id', sourceId);
          data = rows || [];
        } else if (sourceType === 'manual') {
          const { data: rows } = await supabase
            .from('journal_entry_attachments')
            .select('id, file_name, file_path, content_type, file_size')
            .eq('journal_entry_id', transaction.journal_entry_id);
          data = rows || [];
        }

        setAttachments(data);
      } catch (err) {
        console.error('Error fetching attachments:', err);
      } finally {
        setLoadingAttachments(false);
      }
    };

    fetchAttachments();
  }, [transaction, open]);

  if (!transaction) return null;

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(absAmount);
    return amount < 0 ? `(${formatted})` : formatted;
  };

  let netAmount: number;
  if (accountType === 'asset' || accountType === 'expense') {
    netAmount = transaction.debit - transaction.credit;
  } else {
    netAmount = transaction.credit - transaction.debit;
  }

  const handleAttachmentClick = (attachment: Attachment) => {
    const sourceType = transaction.source_type;
    if (sourceType === 'bill' || sourceType === 'bill_payment' || sourceType === 'consolidated_bill_payment') {
      filePreview.openBillAttachment(attachment.file_path, attachment.file_name, {
        mimeType: attachment.content_type || undefined,
        size: attachment.file_size,
      });
    } else if (sourceType === 'check') {
      filePreview.openCheckAttachment(attachment.file_path, attachment.file_name, {
        mimeType: attachment.content_type || undefined,
        size: attachment.file_size,
      });
    } else if (sourceType === 'deposit') {
      filePreview.openDepositAttachment(attachment.file_path, attachment.file_name, {
        mimeType: attachment.content_type || undefined,
        size: attachment.file_size,
      });
    } else if (sourceType === 'credit_card') {
      filePreview.openCreditCardAttachment(attachment.file_path, attachment.file_name, {
        mimeType: attachment.content_type || undefined,
        size: attachment.file_size,
      });
    } else if (sourceType === 'manual') {
      filePreview.openJournalEntryAttachment(attachment.file_path, attachment.file_name, {
        mimeType: attachment.content_type || undefined,
        size: attachment.file_size,
      });
    }
  };

  const details = [
    { label: 'Type', value: getTypeLabel(transaction.source_type) },
    { label: 'Date', value: formatDateSafe(transaction.date, 'MM/dd/yyyy') },
    { label: 'Name', value: transaction.reference || '-' },
    { label: 'Account', value: transaction.accountDisplay || '-' },
    { label: 'Description', value: transaction.description || '-' },
    { label: 'Debit', value: transaction.debit > 0 ? formatCurrency(transaction.debit) : '-' },
    { label: 'Credit', value: transaction.credit > 0 ? formatCurrency(transaction.credit) : '-' },
    { label: 'Amount', value: formatCurrency(netAmount) },
    { label: 'Balance', value: formatCurrency(balance) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Transaction Details</DialogTitle>
          <DialogDescription className="sr-only">
            Full details for this transaction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Detail rows */}
          <div className="grid grid-cols-[120px_1fr] gap-y-2 gap-x-4 text-sm">
            {details.map((item) => (
              <div key={item.label} className="contents">
                <span className="text-muted-foreground font-medium">{item.label}</span>
                <span className="break-words">{item.value}</span>
              </div>
            ))}
            <span className="text-muted-foreground font-medium">Cleared</span>
            <span className="flex items-center gap-1">
              {transaction.reconciled ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Yes</span>
                  {transaction.reconciliation_date && (
                    <span className="text-muted-foreground ml-1">
                      ({formatDateSafe(transaction.reconciliation_date, 'MM/dd/yyyy')})
                    </span>
                  )}
                </>
              ) : (
                <span>No</span>
              )}
            </span>
          </div>

          {/* Attachments section */}
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium mb-2">Attachments</h4>
            {loadingAttachments ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading attachments...
              </div>
            ) : attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attachments found</p>
            ) : (
              <div className="space-y-1">
                {attachments.map((att) => (
                  <button
                    key={att.id}
                    onClick={() => handleAttachmentClick(att)}
                    className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-sm"
                  >
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{att.file_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
