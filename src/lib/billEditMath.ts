// Editing must start from saved allocated amounts, not reconstruct an invoice
// from legacy quantity/rate fields that may describe the unsplit invoice.
export function savedBillRate(amount: number, quantity: number): number {
  return quantity === 0 ? amount : amount / quantity;
}

export function splitEditedBillTotal(total: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 1) throw new Error('A lot split needs at least one lot');
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  return Array.from({ length: count }, (_, i) =>
    (i === count - 1 ? cents - base * (count - 1) : base) / 100);
}

export function committedBillNumber(buffer: string | null, value: number, readOnly = false): number | null {
  if (readOnly || buffer === null) return null;
  const raw = buffer.replace(/,/g, '').trim();
  const parsed = raw === '' ? 0 : Number(raw);
  if (!Number.isFinite(parsed) || parsed === value || parsed === Number(value.toFixed(2))) return null;
  return parsed;
}

export function billTotalChanged(original: number, amounts: number[]): boolean {
  return Math.round(original * 100) !== amounts.reduce((sum, amount) => sum + Math.round(amount * 100), 0);
}