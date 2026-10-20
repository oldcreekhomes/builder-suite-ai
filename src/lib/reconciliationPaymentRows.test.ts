import { describe, it, expect } from 'vitest';
import { buildPaymentRow } from './reconciliationPaymentRows';

describe('buildPaymentRow', () => {
  it('nets a vendor credit against the bill: $635.89 - $500.52 = $135.37', () => {
    const row = buildPaymentRow(135.37, [
      { amount: 635.89, reference: 'INV1' },
      { amount: -500.52, reference: 'CR1' },
    ]);
    expect(row.amount).toBe(135.37);
    expect(row.breakdown.map((b) => b.amount)).toEqual([635.89, -500.52]);
    expect(row.breakdown[1].code.startsWith('Credit')).toBe(true);
  });

  it('uses the saved payment total even when allocations disagree', () => {
    const row = buildPaymentRow(1499.6, [{ amount: 1499.6 + 1150.12 + 1506.12 }]);
    expect(row.amount).toBe(1499.6);
  });

  it('falls back to the allocation sum when no total is saved', () => {
    const row = buildPaymentRow(null, [
      { amount: 1512.65 },
      { amount: 416.59 },
      { amount: -58.73 },
      { amount: 13.42 },
      { amount: 34.15 },
    ]);
    expect(row.amount).toBe(1918.08);
  });
});
