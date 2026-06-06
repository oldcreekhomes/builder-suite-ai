import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Check, FileText, Loader2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateSafe } from "@/utils/dateOnly";
import { useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";
import { parseBillNotes } from "@/lib/billNoteUtils";

const getLatestDescription = (raw: string | null | undefined): string => {
  if (!raw) return '';
  const parsed = parseBillNotes(raw);
  return parsed.length > 0 ? parsed[0].content : raw;
};

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
  includedBillPayments?: IncludedBillPayment[];
  consolidatedTotalAmount?: number;
}

interface IncludedBillPayment {
  id?: string | null;
  bill_payment_id?: string | null;
  source_id?: string | null;
  bill_id?: string | null;
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
  onEditDescription?: () => void;
}

interface DetailItem {
  label: string;
  value: string;
  isDescription?: boolean;
  valueClassName?: string;
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
  onEditDescription,
}: TransactionDetailDialogProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [originalBillDescription, setOriginalBillDescription] = useState<string | null>(null);
  const [originalInvoiceNumbers, setOriginalInvoiceNumbers] = useState<string[]>([]);
  const [originalBillTotal, setOriginalBillTotal] = useState<number | null>(null);
  const [remainingBillBalance, setRemainingBillBalance] = useState<number | null>(null);
  const filePreview = useUniversalFilePreviewContext();

  useEffect(() => {
    if (!transaction || !open) {
      setAttachments([]);
      setOriginalBillDescription(null);
      setOriginalInvoiceNumbers([]);
      setOriginalBillTotal(null);
      setRemainingBillBalance(null);
      return;
    }

    const fetchAttachments = async () => {
      setLoadingAttachments(true);
      try {
        let data: Attachment[] = [];
        const sourceType = transaction.source_type;
        const sourceId = transaction.source_id;

        if (sourceType === 'bill') {
          const { data: rows } = await supabase
            .from('bill_attachments')
            .select('id, file_name, file_path, content_type, file_size')
            .eq('bill_id', sourceId);
          data = rows || [];
        } else if (sourceType === 'bill_payment' || sourceType === 'consolidated_bill_payment') {
          // For bill payments, attachments live on the underlying bill(s).
          // Register bill_payment rows often store the original bill id as source_id,
          // while consolidated rows store the bill payment id and include bill_id allocations.
          const billIds = new Set<string>();
          const paymentIds = new Set<string>();

          if (sourceType === 'bill_payment') {
            billIds.add(sourceId);
            paymentIds.add(sourceId);
          } else {
            paymentIds.add(sourceId);
            if (Array.isArray(transaction.includedBillPayments)) {
              transaction.includedBillPayments.forEach((p) => {
                if (p?.bill_id) billIds.add(p.bill_id);
                if (p?.id) paymentIds.add(p.id);
                if (p?.bill_payment_id) paymentIds.add(p.bill_payment_id);
                if (p?.source_id) paymentIds.add(p.source_id);
              });
            }
          }

          if (paymentIds.size > 0) {
            const { data: allocs } = await supabase
              .from('bill_payment_allocations')
              .select('bill_id')
              .in('bill_payment_id', Array.from(paymentIds));
            const allocationRows = (allocs || []) as Array<{ bill_id: string | null }>;
            allocationRows.forEach((a) => {
              if (a.bill_id) billIds.add(a.bill_id);
            });
          }

          if (billIds.size > 0) {
            const billIdArr = Array.from(billIds);
            const { data: rows } = await supabase
              .from('bill_attachments')
              .select('id, file_name, file_path, content_type, file_size')
              .in('bill_id', billIdArr);
            data = rows || [];

            const { data: billRows } = await supabase
              .from('bills')
              .select('id, reference_number, notes, total_amount, amount_paid')
              .in('id', billIdArr);
            const invoices = (billRows || [])
              .map((b: { reference_number: string | null }) => b.reference_number)
              .filter((v): v is string => !!v && v.trim().length > 0);
            setOriginalInvoiceNumbers(Array.from(new Set(invoices)));

            const totalSum = (billRows || []).reduce(
              (sum: number, b: { total_amount: number | null }) => sum + (Number(b.total_amount) || 0),
              0,
            );
            const paidSum = (billRows || []).reduce(
              (sum: number, b: { amount_paid: number | null }) => sum + (Number(b.amount_paid) || 0),
              0,
            );
            setOriginalBillTotal(Math.round(totalSum * 100) / 100);
            setRemainingBillBalance(Math.round((totalSum - paidSum) * 100) / 100);

            const notes = (billRows || [])
              .map((b: { notes: string | null }) => b.notes)
              .filter((v): v is string => !!v && v.trim().length > 0);
            if (notes.length > 0) {
              setOriginalBillDescription(Array.from(new Set(notes)).join('; '));
            } else {
              // Fall back to bill line memos for these bills
              const { data: lineRows } = await supabase
                .from('bill_lines')
                .select('memo')
                .in('bill_id', billIdArr);
              const memos = (lineRows || [])
                .map((l: { memo: string | null }) => l.memo)
                .filter((v): v is string => !!v && v.trim().length > 0);
              setOriginalBillDescription(memos.length > 0 ? Array.from(new Set(memos)).join('; ') : null);
            }
          }
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

  const isBillPayment = transaction.source_type === 'bill_payment' || transaction.source_type === 'consolidated_bill_payment';
  const attachmentSectionTitle = isBillPayment ? 'Original Bill' : 'Attachments';
  const emptyAttachmentMessage = isBillPayment ? 'No original bill found' : 'No attachments found';

  const details: DetailItem[] = isBillPayment
    ? [
        { label: 'Type', value: getTypeLabel(transaction.source_type) },
        { label: 'Date', value: formatDateSafe(transaction.date, 'MM/dd/yyyy') },
        { label: 'Name', value: transaction.reference || '-' },
        { label: 'Account', value: transaction.accountDisplay || '-' },
        {
          label: 'Description',
          value:
            getLatestDescription(originalBillDescription) ||
            getLatestDescription(transaction.description) ||
            '-',
          isDescription: true,
        },
        {
          label: 'Invoice',
          value: originalInvoiceNumbers.length > 0 ? originalInvoiceNumbers.join(', ') : '-',
        },
        {
          label: 'Original Bill',
          value: originalBillTotal !== null ? formatCurrency(originalBillTotal) : '-',
        },
        {
          label: 'Current Payment',
          value: `(${formatCurrency(Math.abs(netAmount))})`,
          valueClassName: 'text-destructive',
        },
        {
          label: 'Balance',
          value: remainingBillBalance !== null ? formatCurrency(remainingBillBalance) : '-',
        },
      ]
    : [
        { label: 'Type', value: getTypeLabel(transaction.source_type) },
        { label: 'Date', value: formatDateSafe(transaction.date, 'MM/dd/yyyy') },
        { label: 'Name', value: transaction.reference || '-' },
        { label: 'Account', value: transaction.accountDisplay || '-' },
        { label: 'Description', value: getLatestDescription(transaction.description) || '-', isDescription: true },
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
                {item.isDescription && onEditDescription ? (
                  <span className="break-words flex items-center gap-1">
                    {item.value}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-0.5 rounded hover:bg-muted ml-1 shrink-0">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={onEditDescription}>
                          Edit Description
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                ) : (
                  <span className={`break-words${item.valueClassName ? ` ${item.valueClassName}` : ''}`}>{item.value}</span>
                )}
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
            <h4 className="text-sm font-medium mb-2">{attachmentSectionTitle}</h4>
            {loadingAttachments ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading attachments...
              </div>
            ) : attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{emptyAttachmentMessage}</p>
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
