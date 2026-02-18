
## Fix: Paid Tab Columns Being Cut Off (PO Status, Cleared, Actions Missing)

### Root Cause

In `src/components/bills/BillsApprovalTable.tsx`, the table wrapper div at line 600 is:

```tsx
<div className="border rounded-lg">
```

It is missing `overflow-auto`. The table has many columns (Vendor, Cost Code, Bill Date, Due Date, Amount, Reference, Memo, Address, Files, Notes, PO Status, Cleared, Actions), and without `overflow-auto`, anything beyond the visible width is silently clipped — not scrollable, just gone. The user sees the table end abruptly at "Notes."

### The Fix

Add `overflow-auto` to that wrapper div:

```tsx
<div className="border rounded-lg overflow-auto">
```

This restores horizontal scrolling on the table, making PO Status, Cleared, and Actions visible again — identical to how they appeared before (as shown in the user's second screenshot, where all columns are visible).

### File to Edit

- `src/components/bills/BillsApprovalTable.tsx` — line 600
  - Change: `<div className="border rounded-lg">`
  - To: `<div className="border rounded-lg overflow-auto">`
