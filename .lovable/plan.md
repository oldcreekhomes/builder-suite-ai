

## Add "This Bill" Column to PO Details Dialog

### Problem
When reviewing an extracted bill (e.g., INV0021 for $5,252), clicking the PO info button shows historical billing correctly but doesn't show what the current bill is about to allocate. The user can't see that they're about to bill $1,032 against "Decks" or $720 against "Frame basement walls" -- they only see historical data and have to mentally track the new amounts.

### Solution
Add a "This Bill" column to the PO Details Dialog that shows the proposed billing amounts from the current bill being edited, and adjust the "Remaining" column to reflect what it would be after the current bill is accepted.

### How It Works

The table currently shows: Description | Cost Code | PO Amount | Billed | Remaining

It will become: Description | Cost Code | PO Amount | Billed | This Bill | Remaining

- **This Bill** column shows the amount from the current bill's line items that match each PO line (by `purchase_order_id` + `purchase_order_line_id`, or by cost code fallback)
- Amounts in "This Bill" are displayed in blue to distinguish from historical (green) billing
- **Remaining** is recalculated as: PO Amount - Billed - This Bill
- The summary header also updates: adds a "This Bill" total and adjusts "Remaining" to reflect projected remaining

### Technical Details

**New interface for pending allocations:**
```typescript
interface PendingBillLine {
  purchase_order_line_id?: string;
  cost_code_id?: string;
  amount: number;
}
```

**File: `src/components/bills/PODetailsDialog.tsx`**
1. Add optional `pendingBillLines?: PendingBillLine[]` prop
2. Add "This Bill" column header between "Billed" and "Remaining"
3. For each PO line, find matching pending bill lines (by `purchase_order_line_id` first, then cost code fallback)
4. Display pending amounts in blue (`text-blue-600 bg-blue-50`)
5. Subtract pending amounts from remaining calculation
6. Update summary row with pending total
7. Update header summary to show "This Bill" total

**File: `src/components/bills/POSelectionDropdown.tsx`**
1. Add optional `pendingBillLines` prop
2. Pass it through to `PODetailsDialog`

**File: `src/components/bills/EditExtractedBillDialog.tsx`**
1. When rendering `POSelectionDropdown`, compute and pass `pendingBillLines` from the current `jobCostLines` state that are allocated to the same PO

**File: `src/components/bills/PODetailsDialogWrapper.tsx`**
1. No changes needed -- approved bills already show via `currentBillId` green highlighting since they're in the database

### Visual Result

For PO 2025-115E-0006 when viewing INV0021:
```
Description     | PO Amount  | Billed     | This Bill  | Remaining
Decks           | $2,232.00  | $1,000.00  | $1,032.00  | $200.00
Frame basement  | $720.00    | $0.00      | $720.00    | $0.00
```

The "This Bill" column only appears when there are pending allocations (i.e., when opened from the extracted bill editor). For approved bills, the dialog stays as-is with the green highlighting.

### Files Changed

| File | Change |
|------|--------|
| `src/components/bills/PODetailsDialog.tsx` | Add `pendingBillLines` prop, "This Bill" column, adjusted remaining calculation |
| `src/components/bills/POSelectionDropdown.tsx` | Pass `pendingBillLines` through to dialog |
| `src/components/bills/EditExtractedBillDialog.tsx` | Compute and pass `pendingBillLines` from current job cost lines |
