# Add "Reject" to the Approved tab

## Goal
On the Approved bills tab, add a red **Reject** action (directly above **Delete Bill**) inside the row actions menu. Rejecting a posted bill must fully undo its accounting impact (just like the Review-tab reject leaves no accounting trace) and move the bill to the **Rejected** tab.

## What changes

### 1. New mutation `rejectApprovedBill` in `src/hooks/useBills.ts`
Mirrors the existing `rejectBill` flow but also unposts the bill:

1. Confirm bill is `status='posted'` and not reconciled / not paid (safety guard; same checks used elsewhere).
2. Fetch all `journal_entries` where `source_type='bill'` AND `source_id = billId`.
3. Delete those journal entries — `journal_entry_lines` cascade-delete with them. This is the same end state as a Review-tab reject (no GL impact).
4. Append the rejection note to `bills.notes` using the existing `formatBillNote` / `appendBillNote` helpers (identical to current `rejectBill`).
5. Update the bill row: `status = 'void'`, clear `posted_at` if present, update `updated_at`.
6. Invalidate the same query keys `rejectBill` invalidates **plus**: `job-costs`, `job-cost-actual-details`, `bills-for-payment`, `accounts`, and any report keys (so balances refresh).

Toast: "Bill rejected and unposted from General Ledger".

### 2. Wire the action into the Approved-tab row menu — `BillsApprovalTable.tsx`
The Approved tab renders via the `showEditButton` branch around lines 1253–1308. Add a third menu item **between Edit and Delete Bill**:

```ts
{
  label: "Reject",
  onClick: () => setConfirmDialog({ open: true, action: 'reject-approved', billId: bill.id, billInfo: bill, notes: '' }),
  variant: "destructive",
  disabled: bill.reconciled,
}
```

Order in menu (top → bottom): **Edit**, **Reject** (red), **Delete Bill** (red) — matches the screenshot request.

### 3. Reuse the existing reject confirmation dialog
The component already renders a confirm/notes dialog around lines 2042–2111 for the draft Reject flow. Extend `handleConfirmedAction` so when `confirmDialog.action === 'reject-approved'` it calls `rejectApprovedBill.mutate(...)` instead of `rejectBill.mutate(...)`. Reuse the same notes textarea, the same "Reject Bill" button label, and the same required-notes validation. Dialog title for this path: **"Reject Approved Bill"** with a short body: *"This will remove the bill's journal entries and move it to the Rejected tab. The bill record and attachments are preserved."*

### 4. Guards
- Hide/disable Reject when `bill.reconciled` is true (payment already cleared the bank) — same lock pattern already used for Edit/Delete on this row.
- If the bill's posting date sits inside a closed accounting period, block with the existing closed-period toast pattern (`useClosedPeriodCheck`), same as approve/edit flows.

## Out of scope
- No schema changes.
- No reversing-JE audit trail (we delete the posted JE outright; this matches the Review-tab reject's zero-GL-impact behavior and the "Delete Bill" flow's JE handling).
- Paid tab — Reject is **not** added there; paid bills must be unpaid first.
- No changes to the Review, Rejected, or Paid tab menus.

## Verification
1. On Approved tab, open a posted bill's `…` menu → confirm order **Edit / Reject (red) / Delete Bill (red)**.
2. Click **Reject**, enter a note, confirm → toast appears, bill disappears from Approved, appears in **Rejected** with the note.
3. Open the GL / job-costs / A/P aging reports → confirm the bill's amount is no longer included.
4. Try Reject on a reconciled bill → action is disabled with the lock tooltip.
5. Confirm Review-tab Reject flow still works unchanged.
