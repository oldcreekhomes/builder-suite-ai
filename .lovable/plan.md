## Problem

On Manage Bills (Rejected / Approved / Paid tabs), clicking **Edit** in the row's actions dropdown opens both the Edit Bill dialog AND the PO Status Summary dialog.

## Root cause

In `src/components/bills/BillsApprovalTable.tsx`, the bill row (line 934) has an `onClick` that opens the PO Status Summary when the bill has PO matches. The draft-status actions cell (line 1226) correctly stops propagation:

```tsx
<TableCell ... onClick={(e) => e.stopPropagation()}>
```

But the non-draft actions cell at line 1257 (which hosts the Edit / Reject / Delete dropdown for Rejected, Approved, Paid rows) does **not** stop propagation. So clicking Edit fires the action AND bubbles to the row, opening the PO summary.

## Fix

Add `onClick={(e) => e.stopPropagation()}` to the `<TableCell>` at line 1257 wrapping the `TableRowActions` dropdown. One-line change. No effect on the PO Status badge click (separate column, already has its own `stopPropagation`).
