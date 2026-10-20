// Builds the single Reconciliation Review row for a saved (consolidated)
// bill payment. The bank statement shows ONE amount per payment, so the row
// amount is the payment's saved total — bills minus any vendor credits —
// never a sum of whichever journal lines happened to be tagged.

export interface PaymentAllocationInput {
  amount: number; // negative for a vendor credit
  reference?: string | null;
  codes?: string | null;
}

export interface PaymentRowBreakdown {
  code: string;
  amount: number;
}

const toCents = (n: number) => Math.round((Number(n) || 0) * 100);

export function buildPaymentRow(
  totalAmount: number | null | undefined,
  allocations: PaymentAllocationInput[]
): { amount: number; breakdown: PaymentRowBreakdown[] } {
  const allocCents = allocations.reduce((s, a) => s + toCents(a.amount), 0);
  const cents =
    totalAmount === null || totalAmount === undefined ? allocCents : toCents(totalAmount);
  const breakdown = allocations.map((a) => {
    const label = a.amount < 0 ? 'Credit' : 'Bill';
    const ref = a.reference ? ` ${a.reference}` : '';
    const codes = a.codes ? ` · ${a.codes}` : '';
    return { code: `${label}${ref}${codes}`, amount: toCents(a.amount) / 100 };
  });
  return { amount: cents / 100, breakdown };
}

export const PAYMENT_JE_MATCH_WINDOW_DAYS = 7;

export interface PaymentJournalEntryCandidate {
  id: string;
  source_id: string; // bill id
  entry_date: string; // yyyy-mm-dd
  // reconciliation_id of each bank-side line of this entry
  bankLineReconciliationIds: (string | null)[];
}

const dayNum = (d: string) => Math.round(new Date(`${d}T00:00:00Z`).getTime() / 86400000);

/**
 * Picks which bill-payment journal entries belong to a saved payment when it
 * is checked off. Rules:
 *  - A $0.00 payment never claims any bank entry.
 *  - Only entries within PAYMENT_JE_MATCH_WINDOW_DAYS of the payment date.
 *  - Never an entry whose bank line is already cleared in another reconciliation.
 *  - Per bill, the closest date wins (ties all win).
 */
export function pickPaymentJournalEntries(
  payment: { total_amount: number | null | undefined; payment_date: string },
  candidates: PaymentJournalEntryCandidate[],
  currentReconciliationId: string | null | undefined
): string[] {
  if (toCents(Number(payment.total_amount) || 0) === 0) return [];
  const payDay = dayNum(payment.payment_date);
  const best = new Map<string, { ids: string[]; diff: number }>();
  candidates.forEach((c) => {
    const diff = Math.abs(dayNum(c.entry_date) - payDay);
    if (diff > PAYMENT_JE_MATCH_WINDOW_DAYS) return;
    const claimedElsewhere = c.bankLineReconciliationIds.some(
      (r) => r && r !== currentReconciliationId
    );
    if (claimedElsewhere) return;
    const cur = best.get(c.source_id);
    if (!cur || diff < cur.diff) best.set(c.source_id, { ids: [c.id], diff });
    else if (diff === cur.diff) cur.ids.push(c.id);
  });
  return Array.from(best.values()).flatMap((v) => v.ids);
}

export interface SavedPaymentRef {
  payment_date: string;
  reconciliation_id: string | null;
}

/**
 * Review rule for a loose bank journal line of a bill payment: skip it when
 * the bill has a saved payment within the match window that is already
 * cleared in a reconciliation (that payment row represents it at its saved
 * total, in its own month). Otherwise — legacy months where only the journal
 * line was cleared — count the line.
 */
export function shouldCountLooseLine(
  billId: string | null | undefined,
  entryDate: string | null | undefined,
  savedPaymentsByBill: Map<string, SavedPaymentRef[]>
): boolean {
  if (!billId || !entryDate) return true;
  const day = dayNum(entryDate);
  return !(savedPaymentsByBill.get(billId) || []).some(
    (p) =>
      !!p.reconciliation_id &&
      Math.abs(dayNum(p.payment_date) - day) <= PAYMENT_JE_MATCH_WINDOW_DAYS
  );
}
