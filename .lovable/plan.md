

## Fix: Filter Pending Bill Lines When Drilling Into a Specific PO

### Problem
When clicking into PO 2025-115E-0006 from the PO Summary, ALL 3 bill lines ($3,500 + $1,032 + $720) are passed to the detail dialog. The $720 line belongs to a completely different PO (2026-115E-0056), but since it shares cost code 4370 (Framing Labor), it matches against every Framing Labor line in the PO via the cost_code_id fallback -- showing $720 on every row.

### Root Cause
Line 185 in `BillPOSummaryDialog.tsx` passes the unfiltered `derivedPendingBillLines` to `PODetailsDialog`. It needs to be filtered to only the lines that belong to the selected PO.

### Fix (single file: `src/components/bills/BillPOSummaryDialog.tsx`)

**1. Add `purchase_order_id` to `derivedPendingBillLines` mapping (line 75-79)**

Update the mapping to also carry `purchase_order_id` from the bill lines so we can filter by it.

**2. Filter pending lines for the selected PO (line 185)**

Replace:
```tsx
pendingBillLines={derivedPendingBillLines}
```

With logic that filters to only lines where `purchase_order_id` matches the `selectedPoId`. This ensures the $720 line (linked to a different PO) is excluded when viewing PO 2025-115E-0006.

**3. Same filter for single-PO shortcut (line 94)**

Apply the same filter when there's only 1 match and we go directly to the detail dialog -- filter to lines matching that single PO's ID.

### What Doesn't Change
- The PO Summary table itself (correctly shows $3,500 / $1,032 / $720)
- The PODetailsDialog component (its matching logic is fine once it receives correct data)
- No other tabs or dialogs affected

### Expected Result
- Drill into PO 2025-115E-0006: "This Bill" shows $1,032 only on the Decks line, $0 on all Framing Labor lines
- Drill into PO 2026-115E-0056: "This Bill" shows $720 on the correct line
- Drill into PO 2025-115E-0003: "This Bill" shows $3,500 on the Siding line

