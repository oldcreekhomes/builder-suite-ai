// @ts-ignore - bun's built-in test runner (matches existing project tests)
import { describe, it, expect } from 'bun:test';
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

import { shouldCountLooseLine, pickPaymentJournalEntries } from './reconciliationPaymentRows';

describe('shouldCountLooseLine', () => {
  it('never counts a stray line for a bill that has saved payments (earlier-month payment)', () => {
    expect(shouldCountLooseLine('bill-abc', new Set(['bill-abc']))).toBe(false);
  });
  it('counts a line for a legacy bill with no saved payments', () => {
    expect(shouldCountLooseLine('bill-old', new Set(['bill-abc']))).toBe(true);
  });
});

describe('pickPaymentJournalEntries', () => {
  const april = { id: 'je-apr', source_id: 'b1', entry_date: '2026-04-14', bankLineReconciliationIds: ['rec-apr'] };
  it('a $0.00 payment never marks a bank entry', () => {
    const ids = pickPaymentJournalEntries(
      { total_amount: 0, payment_date: '2026-05-15' },
      [{ ...april, bankLineReconciliationIds: [null] }],
      'rec-may'
    );
    expect(ids).toEqual([]);
  });
  it('never claims an entry already cleared in another month', () => {
    const ids = pickPaymentJournalEntries(
      { total_amount: 1431, payment_date: '2026-05-12' },
      [
        { id: 'je-feb', source_id: 'b1', entry_date: '2026-05-10', bankLineReconciliationIds: ['rec-feb'] },
        { id: 'je-may', source_id: 'b1', entry_date: '2026-05-12', bankLineReconciliationIds: [null] },
      ],
      'rec-may'
    );
    expect(ids).toEqual(['je-may']);
  });
  it('ignores entries more than 7 days from the payment date', () => {
    const ids = pickPaymentJournalEntries(
      { total_amount: 64.87, payment_date: '2026-05-15' },
      [{ id: 'je-old', source_id: 'b1', entry_date: '2026-04-15', bankLineReconciliationIds: [null] }],
      'rec-may'
    );
    expect(ids).toEqual([]);
  });
  it('matches an entry dated a couple of days after the payment (2/16 payment, 2/18 entry)', () => {
    const ids = pickPaymentJournalEntries(
      { total_amount: 1818.29, payment_date: '2026-02-16' },
      [{ id: 'je-c', source_id: 'b1', entry_date: '2026-02-18', bankLineReconciliationIds: [null] }],
      'rec-feb'
    );
    expect(ids).toEqual(['je-c']);
  });
});
