# Fix: PO from bid should just use the bid price

## What's happening

When you click **Send PO** on a bidding company row, the app calls an AI edge function (`extract-po-lines`) against the vendor's uploaded proposal PDF. That's what the "Creating PO from machine learning" dialog is — it's running OCR/ML on the file the vendor attached.

In your case the proposal file on "Fake Company" looks like a bank statement / ACH register, so the model extracted 100+ unrelated lines ($7,327, $8,100, $2,208.33, etc.) instead of the $900 bid. That's why the PO is being pre-populated with garbage.

This ML pre-extraction was added on top of the original flow (bid closed → PO created with the bid price). It's not something you set up intentionally in this session — it's baked into `handleOpenConfirmPO` in the bidding row.

## Plan

Revert the bid → PO flow to the simple behavior: **one PO line, cost code from the bid package, amount = the bid price.** No ML.

### Changes

1. **`src/components/bidding/components/BiddingCompanyRow.tsx`**
   - Remove the `usePreExtractPOLines` import + `extract`/`isExtracting` usage.
   - `handleOpenConfirmPO` just opens the dialog. No extraction, no artificial 5s wait.
   - Pass `initialLineItems` = a single line: `{ cost_code_id: costCodeId, description: "", quantity: 1, unit_cost: biddingCompany.price ?? 0, amount: biddingCompany.price ?? 0, extra: false }`.
   - `isExtracting` passed to the dialog stays `false`.

2. **`src/components/bidding/BiddingTableRow.tsx`** (same treatment)
   - Same removal: drop the `extract(...)` + `setTimeout(5000)` call, drop `isExtractingPO` state, pass a single-line seed built from the bid price.

3. **`src/components/CreatePurchaseOrderDialog.tsx`**
   - No structural changes needed — the existing seed path (`bidContext.initialLineItems`) already handles a pre-populated line list.
   - Optional cleanup: since nothing will set `bidContext.isExtracting = true` anymore, the "Creating PO from machine learning" loading screen (lines ~622-660) becomes dead code. Leave the code in place for now (safe, unused) or delete in a follow-up — your call.

4. **`src/hooks/usePreExtractPOLines.ts`** — leave the file alone; it becomes unused but removing it is not required for the fix.

### Out of scope

- No changes to the `extract-po-lines` edge function.
- No changes to bill extraction ("Extracting X bills from machine learning") — that's a separate flow.
- No changes to delete logic, RLS, or PDF preview.

### Result

Opening **Send PO** from a bid instantly shows the Create PO dialog with one line item for the correct cost code at the bid amount ($900 in your example). You can still add lines manually if needed.
