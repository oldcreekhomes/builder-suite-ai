

## Three UI Changes to PO Details Dialog

### 1. Remove monospace font from Cost Code column

**File: `src/components/bills/PODetailsDialog.tsx`** (line 150)

Remove `font-mono` from the Cost Code cell so it matches the Description font.

Change: `className="text-xs font-mono"` to `className="text-xs"`

---

### 2. Delete the Status column

Remove the Status column header (line 136) and all Status cells from line item rows, unallocated row, and totals row.

---

### 3. Highlight billed amounts belonging to the current bill in green

When the dialog shows "Current Bill: INV0012 for $4,206.00", the user needs to see which line-item billed amounts make up that total. For example, $3,206 on "First floor" and $1,000 on "Decks" should be visually highlighted in green so the user can trace how the bill total was allocated.

**How it works:**
- Pass `currentBillId` (the bill's database ID) through the wrapper into the dialog
- For each PO line item, check if any of its `billed_invoices` have a `bill_id` matching the current bill
- If matched, render those specific invoice amounts with a green highlight (green background pill/badge style) instead of the plain number
- The `BilledAmountWithTooltip` component will be updated to accept the `currentBillId` and, when a match exists, render the amount with `bg-green-100 text-green-700 rounded px-1` styling

**Data flow changes:**
- `PODetailsDialogWrapper`: pass `bill.id` as a new `currentBillId` prop
- `PODetailsDialog`: accept `currentBillId` prop, pass it to `BilledAmountWithTooltip`
- `BilledAmountWithTooltip`: if any invoice's `bill_id` matches `currentBillId`, apply green highlight styling to the amount text

**Files to edit:**
- `src/components/bills/PODetailsDialogWrapper.tsx` -- pass `bill?.id` as `currentBillId`
- `src/components/bills/PODetailsDialog.tsx` -- accept prop, remove Status column, remove font-mono, update BilledAmountWithTooltip to highlight matching amounts
