export interface BilledEntry {
  bill_id: string;
  amount: number;
  bill_date: string | null;
  created_at?: string | null;
}

/**
 * Billed to Date for a PO, as seen from a given bill: sum of committed bills
 * dated BEFORE the current bill (same-date bills ordered by created_at),
 * excluding the current bill itself. If the current bill's date is unknown,
 * all other bills are counted.
 */
export function sumBilledPrior(
  entries: BilledEntry[],
  currentBillId: string,
  currentDate?: string | null,
  currentCreatedAt?: string | null,
): number {
  const cd = currentDate ? currentDate.slice(0, 10) : null;
  const total = entries.reduce((s, e) => {
    if (e.bill_id === currentBillId) return s;
    if (cd) {
      const d = (e.bill_date || '').slice(0, 10);
      if (d > cd) return s;
      if (d === cd && currentCreatedAt && (e.created_at || '') >= currentCreatedAt) return s;
    }
    return s + (e.amount || 0);
  }, 0);
  return Math.round(total * 100) / 100;
}
