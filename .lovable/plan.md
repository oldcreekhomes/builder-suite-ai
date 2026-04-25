
## Problem

In the **PO Status dialog** (opened by clicking the PO Status icon on Review / Rejected / Approved / Paid tabs), the **Description** column shows `—` even though the bill itself clearly has descriptions like `"ASSEMBLY FIREPLACE SF-ALLP..."` and `"TARIFF SURCHARGE TARIFF SU..."` in the bill table and in the Edit Bill dialog.

### Root cause

In `src/components/bills/PODetailsDialog.tsx`, the Description column renders **`line.description`**, which is the **PO line's** description (often empty). The dialog already receives the bill-side memos via the `pendingBillLines` prop (each has a `memo` field), but it never displays them.

The data is already wired through correctly:
- `BillPOSummaryDialog` builds `derivedPendingBillLines` from `bill.bill_lines` (preserving each line's `memo`) and passes them to `PODetailsDialog` as `pendingBillLines` (line 194 of `BillPOSummaryDialog.tsx`).
- The same `getPendingForLine(...)` helper inside `PODetailsDialog` already determines exactly which pending bill line(s) get attributed to each PO line.

We just need the dialog to **render the matched pending bill line memos in the Description cell**, the same way the bill table and Edit Bill dialog display them.

`PODetailsDialogWrapper.tsx` is currently unused at runtime (the Approval/Pay/Review tables use `BillPOSummaryDialog`), so no change is needed there.

## Plan

### File: `src/components/bills/PODetailsDialog.tsx`

1. **Add a small helper inside the component** (next to the existing `getPendingForLine`):
   ```ts
   // Returns the bill-side memos attributed to this PO line, using the SAME
   // tier rules as getPendingForLine so Description and "This Bill" stay in sync.
   const getPendingMemosForLine = (lineId: string, lineCostCodeId?: string, lineDescription?: string): string[] => {
     // mirrors getPendingForLine, but collects pbl.memo strings instead of summing amount
   };
   ```
   This guarantees the Description we show is for the *exact same* pending bill line(s) that contribute to the row's "This Bill" amount — no risk of showing a memo from a different PO's line.

2. **Update the Description cell** (currently `{line.description || '—'}`):
   ```tsx
   <TableCell>
     {(() => {
       const billMemos = getPendingMemosForLine(line.id, line.cost_code_id, line.description);
       const text = billMemos.length > 0
         ? billMemos.join(', ')
         : (line.description || '—');
       return (
         <Tooltip>
           <TooltipTrigger asChild>
             <span className="block truncate max-w-[260px]">{text}</span>
           </TooltipTrigger>
           <TooltipContent className="max-w-md">
             <p className="whitespace-pre-wrap break-words">{text}</p>
           </TooltipContent>
         </Tooltip>
       );
     })()}
   </TableCell>
   ```
   - **Priority**: bill memo (what user sees in the bill table & Edit Bill dialog) → PO line description → `—`.
   - **Multiple bill lines on one PO line** (e.g., the screenshot's two-line invoice both mapped to one fireplace PO line): join memos with `, ` and surface the full text in a tooltip — matches the standard tooltip pattern used elsewhere in this dialog (`BilledAmountWithTooltip`) and the rest of the app.

3. **Cost Code cell** — for parity with the bill/Edit Bill dialog (which the user just got us to standardize), wrap the cost code text in the same shadcn `Tooltip` so long names don't get clipped silently.

4. **No changes to math, totals, status badges, or the underlying queries.** Pure presentation change in one cell, plus a matching helper that re-uses the existing tier logic.

### Files NOT changing
- `BillPOSummaryDialog.tsx` — already passes `pendingBillLines` with `memo`.
- `PODetailsDialogWrapper.tsx` — not on this code path.
- `useVendorPurchaseOrders.ts` — already returns everything we need.

## Result

The PO Status dialog's Description column will display:
- `"ASSEMBLY FIREPLACE SF-ALLP10238400Q, TARIFF SURCHARGE TARIFF SURCHARGE"` (full memos available on hover)

…instead of `—`, exactly matching the Description shown in the bills table and the Edit Bill / Edit Extracted Bill dialogs across **Review, Rejected, Approved, and Paid**.
