# Fix Amount Column Penny Mismatch (Manage Bills)

## What's happening

On the Manage Bills table (Review / Approved / Paid tabs), the **Amount** column shows `$216.38` for the Amazon bill `112-8095482-9208204`, but every other place (Edit Bill dialog, line items, totals) correctly shows `$216.37`.

## Root cause

In `src/components/bills/BillsApprovalTable.tsx` (lines 762-770), the function `getBillDisplayAmount` does NOT use the bill's authoritative `total_amount`. Instead, it re-sums each `bill_line.amount` after rounding each line individually to 2 decimals:

```ts
const getBillDisplayAmount = (bill) => {
  if (bill.bill_lines && bill.bill_lines.length > 0) {
    return bill.bill_lines.reduce((sum, line) => {
      const lineAmount = Math.round((line.amount || 0) * 100) / 100;
      return sum + lineAmount;
    }, 0);
  }
  return bill.total_amount;
};
```

For the Amazon bill, the DB actually stores **two** bill_lines (one per lot allocation), each with `amount = 108.19`. The true unrounded line value is `108.185`, but it's persisted rounded to `108.19`. Summing the two rounded lines gives `216.38`, while `bills.total_amount = 216.37` (the correct invoice total).

This affects any bill that was split across lots / cost codes where individual line amounts were rounded up. The Edit dialog and the Bill itself remain correct because they read `total_amount` directly.

## Fix

Make the Amount column trust the bill's stored `total_amount` (the authoritative invoice total) instead of re-summing rounded line amounts.

**File:** `src/components/bills/BillsApprovalTable.tsx`

Replace `getBillDisplayAmount` so it simply returns `bill.total_amount`. The `bill_lines` fallback isn't needed — `total_amount` is always populated when a bill is created (via `approve_pending_bill` RPC and manual entry).

```ts
const getBillDisplayAmount = (bill: BillForApproval): number => {
  return bill.total_amount;
};
```

Open Balance math at lines 1031-1038 already uses `bill.total_amount` directly, so it stays consistent.

## Scope / safety

- One function change, ~7 lines.
- No DB writes, no schema change, no migration.
- No effect on Job Costs, Budget, Reports, journal entries, payments — those all read their own sources.
- Fixes the display for every bill, not just Amazon, where lot-split rounding caused a ±$0.01 drift.
