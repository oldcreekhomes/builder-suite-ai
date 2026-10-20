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
