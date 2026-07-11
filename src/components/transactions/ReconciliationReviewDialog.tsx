import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TransactionDetailDialog } from "@/components/accounting/TransactionDetailDialog";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";
import { supabase } from "@/integrations/supabase/client";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

interface BreakdownEntry {
  code: string;
  amount: number;
}

interface ClickTxn {
  source_type: string;
  source_id: string;
  line_id: string;
  journal_entry_id: string;
  debit: number;
  credit: number;
  created_at: string;
}

interface ClearedTransaction {
  id: string;
  date: string;
  payee: string;
  reference?: string;
  description?: string;
  costCode?: string;
  costCodeBreakdown?: BreakdownEntry[];
  sourceBreakdown?: BreakdownEntry[];
  amount: number;
  type: 'check' | 'deposit' | 'bill_payment' | 'journal_entry';
  _txn?: ClickTxn;
}

// Group items by a key and sum amounts (cent-precise), resolving labels via a map
function buildBreakdown(
  items: { key?: string | null; amount?: number | string | null }[],
  labelMap: Map<string, string>
): BreakdownEntry[] {
  const totals = new Map<string, number>();
  items.forEach((l) => {
    const label = l.key ? labelMap.get(l.key) : undefined;
    if (!label) return;
    const amt = Math.round(Number(l.amount || 0) * 100);
    totals.set(label, (totals.get(label) || 0) + amt);
  });
  return Array.from(totals.entries())
    .map(([code, cents]) => ({ code, amount: cents / 100 }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}

function buildCostCodeBreakdown(
  lines: { cost_code_id?: string | null; amount?: number | string | null }[],
  ccMap: Map<string, string>
): BreakdownEntry[] {
  return buildBreakdown(
    lines.map((l) => ({ key: l.cost_code_id, amount: l.amount })),
    ccMap
  );
}



// Combine distinct line memos into a compact description
function summarizeMemos(memos: (string | null | undefined)[]): string | undefined {
  const cleaned = Array.from(
    new Set(
      memos
        .map((m) => (m ?? '').trim())
        .filter((m) => m.length > 0)
    )
  );
  if (cleaned.length === 0) return undefined;
  if (cleaned.length <= 2) return cleaned.join('; ');
  return `${cleaned.slice(0, 2).join('; ')}…`;
}

export function ReconciliationReviewDialog({
  open,
  onOpenChange,
  reconciliation,
  bankAccountId,
}: ReconciliationReviewDialogProps) {
  const reconciliationId = reconciliation?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['reconciliation-transactions-by-id', 'v2', reconciliationId],
    queryFn: async () => {
      if (!reconciliationId || !bankAccountId) {
        return { checks: [], deposits: [], billPayments: [], journalEntries: [] };
      }

      // ----- Checks -----
      const { data: checks } = await supabase
        .from('checks')
        .select('id, check_date, pay_to, amount, check_number, memo')
        .eq('reconciliation_id', reconciliationId);

      const checkIds = (checks || []).map((c) => c.id);
      const { data: checkLines } = checkIds.length
        ? await supabase
            .from('check_lines')
            .select('check_id, memo, cost_code_id, line_number, amount')
            .in('check_id', checkIds)
            .order('line_number', { ascending: true })
        : { data: [] as any[] };

      // ----- Deposits -----
      const { data: deposits } = await supabase
        .from('deposits')
        .select('id, deposit_date, memo, amount, company_name, company_id')
        .eq('reconciliation_id', reconciliationId);

      const depositIds = (deposits || []).map((d) => d.id);
      const { data: depositLines } = depositIds.length
        ? await supabase
            .from('deposit_lines')
            .select('deposit_id, memo, line_number, account_id, amount')
            .in('deposit_id', depositIds)
            .order('line_number', { ascending: true })
        : { data: [] as any[] };

      // Lookup companies for deposit source name (matches Bank Register logic)
      const depositCompanyIds = Array.from(
        new Set(
          (deposits || [])
            .map((d: any) => d.company_id)
            .filter(Boolean)
        )
      );
      const { data: depositCompanies } = depositCompanyIds.length
        ? await supabase
            .from('companies')
            .select('id, company_name')
            .in('id', depositCompanyIds)
        : { data: [] as any[] };
      const depositCompanyMap = new Map(
        (depositCompanies || []).map((c: any) => [c.id, c.company_name])
      );


      // ----- Bill payments via JE lines -----
      let billPayments: ClearedTransaction[] = [];

      const { data: reconciledBillPaymentLines } = await supabase
        .from('journal_entry_lines')
        .select(`
          id,
          credit,
          journal_entry_id,
          journal_entries!inner (
            id,
            entry_date,
            source_type,
            source_id
          )
        `)
        .eq('reconciliation_id', reconciliationId)
        .eq('account_id', bankAccountId)
        .gt('credit', 0);

      const bpLines = (reconciledBillPaymentLines || []).filter(
        (line: any) => line.journal_entries?.source_type === 'bill_payment'
      );

      // Collect all bill IDs we need details for (JE path + legacy path)
      const jeBillIds = bpLines
        .map((l: any) => l.journal_entries?.source_id)
        .filter(Boolean);

      // ----- Legacy bills directly reconciled -----
      const { data: legacyBills } = await supabase
        .from('bills')
        .select('id, reference_number, vendor_id, notes, reconciliation_date')
        .eq('reconciliation_id', reconciliationId);

      const allBillIds = Array.from(
        new Set([...jeBillIds, ...((legacyBills || []).map((b) => b.id))])
      );

      // Fetch bill details + lines
      const { data: allBills } = allBillIds.length
        ? await supabase
            .from('bills')
            .select('id, reference_number, vendor_id, notes')
            .in('id', allBillIds)
        : { data: [] as any[] };

      const { data: billLines } = allBillIds.length
        ? await supabase
            .from('bill_lines')
            .select('bill_id, memo, cost_code_id, line_number, amount')
            .in('bill_id', allBillIds)
            .order('line_number', { ascending: true })
        : { data: [] as any[] };

      // Vendors
      const vendorIds = Array.from(
        new Set((allBills || []).map((b: any) => b.vendor_id).filter(Boolean))
      );
      const { data: vendors } = vendorIds.length
        ? await supabase
            .from('companies')
            .select('id, company_name')
            .in('id', vendorIds)
        : { data: [] as any[] };
      const vendorMap = new Map((vendors || []).map((v: any) => [v.id, v.company_name]));
      const billMap = new Map((allBills || []).map((b: any) => [b.id, b]));

      // ----- All bank-account JE lines for this reconciliation -----
      // Used for manual JE transactions AND to enrich checks/deposits with
      // journal_entry_id, line_id, debit/credit, created_at for the detail dialog.
      const { data: jeLines } = await supabase
        .from('journal_entry_lines')
        .select(`
          id,
          debit,
          credit,
          memo,
          cost_code_id,
          journal_entry_id,
          created_at,
          journal_entries!inner (
            id,
            entry_date,
            description,
            source_type,
            source_id
          )
        `)
        .eq('reconciliation_id', reconciliationId)
        .eq('account_id', bankAccountId);

      // Map source_type:source_id -> ClickTxn for check/deposit lookup
      const sourceTxnMap = new Map<string, ClickTxn>();
      (jeLines || []).forEach((line: any) => {
        const je = line.journal_entries;
        if (!je?.source_type || !je?.source_id) return;
        const key = `${je.source_type}:${je.source_id}`;
        if (sourceTxnMap.has(key)) return;
        sourceTxnMap.set(key, {
          source_type: je.source_type,
          source_id: je.source_id,
          line_id: line.id,
          journal_entry_id: line.journal_entry_id,
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
          created_at: line.created_at,
        });
      });


      const manualJeLines = (jeLines || []).filter(
        (line: any) => line.journal_entries?.source_type === 'manual'
      );

      // ----- Cost codes lookup for everything -----
      const allCostCodeIds = Array.from(
        new Set(
          [
            ...(checkLines || []).map((l: any) => l.cost_code_id),
            ...(billLines || []).map((l: any) => l.cost_code_id),
            ...manualJeLines.map((l: any) => l.cost_code_id),
          ].filter(Boolean)
        )
      );
      const { data: costCodes } = allCostCodeIds.length
        ? await supabase
            .from('cost_codes')
            .select('id, code, name')
            .in('id', allCostCodeIds)
        : { data: [] as any[] };
      const ccMap = new Map(
        (costCodes || []).map((c: any) => [c.id, `${c.code} - ${c.name}`])
      );

      // Group check lines by check_id
      const checkLinesByCheck = new Map<string, any[]>();
      (checkLines || []).forEach((l: any) => {
        const arr = checkLinesByCheck.get(l.check_id) || [];
        arr.push(l);
        checkLinesByCheck.set(l.check_id, arr);
      });

      // Group bill lines by bill_id
      const billLinesByBill = new Map<string, any[]>();
      (billLines || []).forEach((l: any) => {
        const arr = billLinesByBill.get(l.bill_id) || [];
        arr.push(l);
        billLinesByBill.set(l.bill_id, arr);
      });

      // Group deposit lines by deposit_id
      const depositLinesByDeposit = new Map<string, any[]>();
      (depositLines || []).forEach((l: any) => {
        const arr = depositLinesByDeposit.get(l.deposit_id) || [];
        arr.push(l);
        depositLinesByDeposit.set(l.deposit_id, arr);
      });

      // ----- Build bill payments from JE lines -----
      if (bpLines.length > 0) {
        billPayments = bpLines
          .map((line: any) => {
            const billId = line.journal_entries.source_id;
            const bill: any = billMap.get(billId);
            const lines = billLinesByBill.get(billId) || [];
            const description =
              summarizeMemos(lines.map((l: any) => l.memo)) ||
              (bill?.notes && String(bill.notes).trim()) ||
              undefined;
            return {
              id: line.id,
              date: line.journal_entries.entry_date || '',
              payee: bill ? (vendorMap.get(bill.vendor_id) || 'Unknown Vendor') : 'Unknown Vendor',
              reference: bill?.reference_number || undefined,
              description,
              costCodeBreakdown: buildCostCodeBreakdown(lines, ccMap),
              amount: Number(line.credit),
              type: 'bill_payment' as const,
            };
          })
          .filter((bp: ClearedTransaction) => bp.amount > 0);
      }

      // ----- Legacy bills path -----
      if (legacyBills && legacyBills.length > 0) {
        const legacyBillIds = legacyBills.map((b) => b.id);

        const { data: journalEntries } = await supabase
          .from('journal_entries')
          .select('id, entry_date, source_id')
          .eq('source_type', 'bill_payment')
          .in('source_id', legacyBillIds);

        if (journalEntries && journalEntries.length > 0) {
          const jeIds = journalEntries.map((je) => je.id);
          const { data: journalLines } = await supabase
            .from('journal_entry_lines')
            .select('journal_entry_id, credit')
            .in('journal_entry_id', jeIds)
            .eq('account_id', bankAccountId)
            .gt('credit', 0);

          const billToAmount = new Map<string, number>();
          const billToDate = new Map<string, string>();
          journalEntries.forEach((je) => {
            const lines = (journalLines || []).filter((l) => l.journal_entry_id === je.id);
            const total = lines.reduce((sum, l) => sum + Number(l.credit), 0);
            billToAmount.set(je.source_id, (billToAmount.get(je.source_id) || 0) + total);
            const existingDate = billToDate.get(je.source_id);
            if (!existingDate || je.entry_date > existingDate) {
              billToDate.set(je.source_id, je.entry_date);
            }
          });

          const legacyPayments = legacyBills
            .map((bill) => {
              const lines = billLinesByBill.get(bill.id) || [];
              const description =
                summarizeMemos(lines.map((l: any) => l.memo)) ||
                (bill.notes && String(bill.notes).trim()) ||
                undefined;
              return {
                id: bill.id,
                date: billToDate.get(bill.id) || '',
                payee: vendorMap.get(bill.vendor_id) || 'Unknown Vendor',
                reference: bill.reference_number || undefined,
                description,
                costCodeBreakdown: buildCostCodeBreakdown(lines, ccMap),
                amount: billToAmount.get(bill.id) || 0,
                type: 'bill_payment' as const,
              };
            })
            .filter((bp) => bp.amount > 0);

          const seenBillIds = new Set(
            bpLines.map((l: any) => l.journal_entries?.source_id).filter(Boolean)
          );
          legacyPayments.forEach((lp) => {
            if (!seenBillIds.has(lp.id)) billPayments.push(lp);
          });
        }
      }

      // ----- Manual JE transactions -----
      const journalEntryTransactions: ClearedTransaction[] = manualJeLines.map((line: any) => {
        const label = line.cost_code_id ? ccMap.get(line.cost_code_id) : undefined;
        const amt = Number(line.debit) > 0 ? Number(line.debit) : Number(line.credit);
        return {
          id: line.id,
          date: line.journal_entries?.entry_date || '',
          payee: line.journal_entries?.description || 'Manual Journal Entry',
          description: line.memo || undefined,
          costCode: label,
          costCodeBreakdown: label ? [{ code: label, amount: amt }] : [],
          amount: Number(line.debit) > 0 ? Number(line.debit) : -Number(line.credit),
          type: 'journal_entry' as const,
          _txn: {
            source_type: 'manual',
            source_id: line.journal_entry_id,
            line_id: line.id,
            journal_entry_id: line.journal_entry_id,
            debit: Number(line.debit) || 0,
            credit: Number(line.credit) || 0,
            created_at: line.created_at,
          },
        };
      });

      // Attach _txn to bill payment rows from the JE map
      billPayments = billPayments.map((bp: any) => {
        // bp.id for JE-path is the JE line id; for legacy path it's the bill id.
        // Look up by bill id via bpLines list.
        const bpLine = (bpLines as any[]).find((l) => l.id === bp.id);
        if (bpLine) {
          return {
            ...bp,
            _txn: {
              source_type: 'bill_payment',
              source_id: bpLine.journal_entries?.source_id,
              line_id: bpLine.id,
              journal_entry_id: bpLine.journal_entry_id,
              debit: 0,
              credit: Number(bpLine.credit) || 0,
              created_at: (bpLine as any).created_at || new Date().toISOString(),
            },
          };
        }
        // Legacy: look up by bill source_id
        const key = `bill_payment:${bp.id}`;
        const t = sourceTxnMap.get(key);
        return t ? { ...bp, _txn: t } : bp;
      });

      return {
        checks: (checks || []).map((c) => {
          const lines = checkLinesByCheck.get(c.id) || [];
          const description =
            summarizeMemos(lines.map((l: any) => l.memo)) ||
            (c.memo && String(c.memo).trim()) ||
            undefined;
          return {
            id: c.id,
            date: c.check_date,
            payee: c.pay_to,
            reference: c.check_number || undefined,
            description,
            costCodeBreakdown: buildCostCodeBreakdown(lines, ccMap),
            amount: c.amount,
            type: 'check' as const,
            _txn: sourceTxnMap.get(`check:${c.id}`),
          };
        }),
        deposits: (deposits || []).map((d: any) => {
          const lines = depositLinesByDeposit.get(d.id) || [];
          const description =
            summarizeMemos(lines.map((l: any) => l.memo)) ||
            (d.memo && String(d.memo).trim()) ||
            undefined;
          // Source mirrors the Bank Register "Name" column:
          // deposit.memo || company_name || 'Cash'
          const source =
            (d.memo && String(d.memo).trim()) ||
            (d.company_id && depositCompanyMap.get(d.company_id)) ||
            (d.company_name && String(d.company_name).trim()) ||
            'Cash';
          return {
            id: d.id,
            date: d.deposit_date,
            payee: source,
            description,
            amount: d.amount,
            type: 'deposit' as const,
            _txn: sourceTxnMap.get(`deposit:${d.id}`),
          };
        }),
        billPayments,
        journalEntries: journalEntryTransactions,
      };

    },
    enabled: open && !!reconciliationId && !!bankAccountId,
  });

  const [selectedTxn, setSelectedTxn] = useState<any>(null);

  const openDetail = (t: ClearedTransaction) => {
    if (!t._txn) return;
    setSelectedTxn({
      source_id: t._txn.source_id,
      line_id: t._txn.line_id,
      journal_entry_id: t._txn.journal_entry_id,
      date: t.date,
      memo: t.description || null,
      description: t.description || null,
      reference: t.reference || null,
      accountDisplay: null,
      source_type: t._txn.source_type,
      debit: t._txn.debit,
      credit: t._txn.credit,
      created_at: t._txn.created_at,
      reconciled: true,
      reconciliation_date: reconciliation?.statement_date || null,
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const allDebits = [
    ...(data?.checks || []),
    ...(data?.billPayments || []),
    ...(data?.journalEntries || []).filter((je) => je.amount > 0),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const allCredits = [
    ...(data?.deposits || []),
    ...(data?.journalEntries || [])
      .filter((je) => je.amount < 0)
      .map((je) => ({ ...je, amount: Math.abs(je.amount) })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const totalDebits = allDebits.reduce((sum, t) => sum + t.amount, 0);
  const totalCredits = allCredits.reduce((sum, t) => sum + t.amount, 0);

  const beginningBalance = reconciliation?.statement_beginning_balance || 0;
  const endingBalance = reconciliation?.statement_ending_balance || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
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
                            <th className="p-2 text-left">Description</th>
                            <th className="p-2 text-left">Reference</th>
                            <th className="p-2 text-left">Cost Code</th>
                            <th className="p-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allDebits.map((t) => (
                            <tr
                              key={t.id}
                              className={`border-t ${t._txn ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                              onClick={() => openDetail(t)}
                            >
                              <td className="p-2">
                                {t.date ? formatDateSafe(t.date, "MM/dd/yyyy") : '-'}
                              </td>
                              <td className="p-2">
                                {t.type === 'bill_payment' ? 'Pmt' :
                                 t.type === 'journal_entry' ? 'JE' : 'Check'}
                              </td>
                              <td className="p-2">{t.payee}</td>
                              <td className="p-2 max-w-[220px]" onClick={(e) => e.stopPropagation()}>
                                <DescriptionCell text={t.description} />
                              </td>
                              <td className="p-2">{t.reference || '-'}</td>
                              <td className="p-2 max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                                <BreakdownCell
                                  breakdown={t.costCodeBreakdown}
                                  title="Included Cost Codes"
                                  formatCurrency={formatCurrency}
                                />
                              </td>
                              <td className="p-2 text-right text-destructive font-medium whitespace-nowrap">
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
                            <th className="p-2 text-left">Description</th>
                            <th className="p-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allCredits.map((t) => (
                            <tr
                              key={t.id}
                              className={`border-t ${t._txn ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                              onClick={() => openDetail(t)}
                            >
                              <td className="p-2">
                                {t.date ? formatDateSafe(t.date, "MM/dd/yyyy") : '-'}
                              </td>
                              <td className="p-2">
                                {t.type === 'journal_entry' ? 'JE' : 'Deposit'}
                              </td>
                              <td className="p-2 max-w-[240px] truncate">{t.payee}</td>
                              <td className="p-2 max-w-[260px]" onClick={(e) => e.stopPropagation()}>
                                <DescriptionCell text={t.description} />
                              </td>
                              <td className="p-2 text-right text-green-600 font-medium whitespace-nowrap">
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
      <TransactionDetailDialog
        transaction={selectedTxn}
        balance={0}
        accountType="asset"
        open={!!selectedTxn}
        onOpenChange={(o) => { if (!o) setSelectedTxn(null); }}
      />
    </Dialog>
  );
}


function BreakdownCell({
  breakdown,
  fallback,
  title,
  formatCurrency,
}: {
  breakdown?: BreakdownEntry[];
  fallback?: string;
  title: string;
  formatCurrency: (n: number) => string;
}) {
  if (!breakdown || breakdown.length === 0) {
    return <span className="truncate block">{fallback || '-'}</span>;
  }
  if (breakdown.length === 1) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="truncate block cursor-default">{breakdown[0].code}</span>
          </TooltipTrigger>
          <TooltipContent side="top" align="start">
            {breakdown[0].code}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  const total = breakdown.reduce((sum, e) => sum + e.amount, 0);
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs cursor-help truncate block">
            {breakdown[0].code} <span className="text-muted-foreground">+{breakdown.length - 1}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-xs mb-2">{title}:</p>
            {breakdown.map((e, i) => (
              <div key={`${e.code}-${i}`} className="flex justify-between gap-4 text-xs">
                <span className="truncate max-w-[150px]">{e.code}</span>
                <span>{formatCurrency(e.amount)}</span>
              </div>
            ))}
            <div className="border-t pt-1 mt-1 flex justify-between gap-4 text-xs font-medium">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


function DescriptionCell({ text }: { text?: string }) {
  if (!text) return <span>-</span>;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="truncate block cursor-default">{text}</span>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-md">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


