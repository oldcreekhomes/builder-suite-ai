// @ts-ignore - bun's built-in test runner
import { expect, test } from 'bun:test';
import { billTotalChanged, committedBillNumber, savedBillRate, splitEditedBillTotal } from './billEditMath';
import { groupBillLines, rowTotal } from './billLineMath';

test('MSG680 stays $1,523 across two lots and displays invoice totals, not per-lot rates', () => {
  const lines = [
    { id: 'labor1', costCodeKey: 'labor', memo: '', purchaseOrderId: '', purchaseOrderLineId: '', quantity: 1, unitCost: 446.5, lotId: '1' },
    { id: 'labor2', costCodeKey: 'labor', memo: '', purchaseOrderId: '', purchaseOrderLineId: '', quantity: 1, unitCost: 446.5, lotId: '2' },
    { id: 'stone1', costCodeKey: 'stone', memo: '', purchaseOrderId: '', purchaseOrderLineId: '', quantity: 1, unitCost: 315, lotId: '1' },
    { id: 'stone2', costCodeKey: 'stone', memo: '', purchaseOrderId: '', purchaseOrderLineId: '', quantity: 1, unitCost: 315, lotId: '2' },
  ];
  const groups = groupBillLines(lines, l => l);
  expect(groups.map(g => [g.quantity, g.unitCost, g.amount])).toEqual([[1, 893, 893], [1, 630, 630]]);
  expect(groups.reduce((sum, g) => sum + g.amount, 0)).toBe(1523);
  expect(splitEditedBillTotal(groups[0].unitCost, 2)).toEqual([446.5, 446.5]);
});

test('splitting $158 across six lots never multiplies the total or loses pennies', () => {
  const allocated = splitEditedBillTotal(158, 6);
  expect(allocated).toEqual([26.33, 26.33, 26.33, 26.33, 26.33, 26.35]);
  expect(allocated.reduce((sum, n) => sum + Math.round(n * 100), 0)).toBe(15800);
});

test('saved $15 allocation with stale $30 quantity/rate math survives reopening', () => {
  expect(savedBillRate(15, 2)).toBe(7.5);
  expect(rowTotal(2, savedBillRate(15, 2))).toBe(15);
});

test('saved allocation amounts win over inconsistent quantity/rate in lot grouping', () => {
  const groups = groupBillLines([1, 2], id => ({ id: String(id), costCodeKey: 'c', memo: '', purchaseOrderId: '', purchaseOrderLineId: '', quantity: 1, unitCost: 1523, amount: 761.5, lotId: String(id) }));
  expect(groups[0].amount).toBe(1523);
  expect(groups[0].unitCost).toBe(1523);
});

test('blur without an edit cannot reset a bill amount to zero', () => {
  expect(committedBillNumber(null, 1523)).toBeNull();
  expect(committedBillNumber('1523.00', 1523)).toBeNull();
  expect(committedBillNumber('26.33', 158 / 6)).toBeNull();
});

test('read-only approved amounts cannot change on blur', () => {
  expect(committedBillNumber('3046.00', 1523, true)).toBeNull();
});

test('an intentional change to $3,046 needs confirmation, while a lot reallocation does not', () => {
  expect(billTotalChanged(1523, [893, 893, 630, 630])).toBe(true);
  expect(billTotalChanged(1523, [446.5, 446.5, 315, 315])).toBe(false);
  expect(billTotalChanged(1523, [1523.01])).toBe(true);
});

test('currency input commits edited numbers but never invalid input', () => {
  expect(committedBillNumber('1,523.00', 3046)).toBe(1523);
  expect(committedBillNumber('invalid', 1523)).toBeNull();
});