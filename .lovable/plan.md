

## Problem
In the **PO Status Summary** dialog (Enter with AI), the "This Bill" column shows `$6,830.00` for both `2025-923T-0027` (Cornice) and `2025-923T-0036` (Exterior Trim / Cornice) instead of `$4,030.00` and `$2,800.00` respectively. Siding row is correct at `$20,350.00`.

Two PO lines share cost code `4400`, so the current logic in `BillPOSummaryDialog.getThisBillAmount` collapses them by summing all bill lines with that cost code per PO.

## Root cause
In `src/components/bills/BillPOSummaryDialog.tsx`, `getThisBillAmount(match)`:

```ts
.filter(line => {
  if (line.purchase_order_id && line.purchase_order_id !== '__auto__' && line.purchase_order_id !== '__none__') {
    return line.purchase_order_id === match.po_id;
  }
  return line.cost_code_id === match.cost_code_id;  // ← collapses both 4400 POs
})
```

When a bill line has a `purchase_order_id` set, the filter only checks PO id and ignores `purchase_order_line_id`. When it doesn't, the cost-code fallback matches BOTH POs that share `4400`, doubling the amount on each.

The fix must prefer `purchase_order_line_id` (now persisted end-to-end) before falling back to `purchase_order_id`, and only use the cost-code fallback when neither is present AND the cost code is unique among matches.

## Fix

### File: `src/components/bills/BillPOSummaryDialog.tsx`

1. Update `getThisBillAmount(match)` to allocate strictly:
   - If `line.purchase_order_line_id` is set → match against `match.po_line_id` (or equivalent on `POMatch`); fall back to PO id only when the line id can't be resolved.
   - Else if `line.purchase_order_id` is a real id → match `match.po_id`.
   - Else (auto/none/null PO) → cost-code fallback, BUT only attribute the line to this match if no other match in `matches` shares that cost code. If multiple do, attribute proportionally by `po_amount` (or skip — see step 3).

2. Same correction in the single-match early return and in the drill-down `pendingBillLines` filter at the bottom (`l.purchase_order_id === selectedPoId` currently misses lines linked by `purchase_order_line_id`).

3. Confirm `POMatch` exposes the PO line id. If `useBillPOMatching` doesn't already include `po_line_id` on each match, add it there so the dialog can disambiguate. Quick check needed in `src/hooks/useBillPOMatching.ts` during implementation.

4. Verify the bill lines passed in from `BatchBillReviewTable.tsx` carry `purchase_order_line_id` (already done in prior step) so the new filter has data to work with.

## Out of scope
- No changes to extraction, persistence, or the approval flow — those already store `purchase_order_line_id`.
- No styling changes.

## Verification
For bill `C26019`:
- Row `2025-923T-0035` / `4470: Siding` → This Bill `$20,350.00`, Remaining `$0.00`, Matched.
- Row `2025-923T-0036` / `4400: Exterior Trim / Cornice` → This Bill `$2,800.00`, Remaining `$0.00`, Matched.
- Row `2025-923T-0027` / `4400: Exterior Trim / Cornice` → This Bill `$4,030.00`, Remaining `$0.00`, Matched.
- Sum of "This Bill" column = `$27,180.00` (bill total).
- Spot-check a single-PO AI bill — still shows correct single value.
- Spot-check Review/Approved tab on a bill with two POs sharing a cost code — same correct split.

