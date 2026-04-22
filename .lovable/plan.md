

## Fix Edit Extracted Bill ↔ PO Status Summary mismatch

### What's actually broken

You're seeing three separate symptoms from two underlying bugs.

**Symptom A — AI lumped $11,568 onto "Siding" on first open.**  
The vendor sent a labor-style invoice. The model occasionally collapses multi-row labor invoices into a single dollar bucket on the dominant cost code (Siding here, the biggest line). This is an AI extraction quality problem, not a save/match problem.

**Symptom B — PO Status Summary shows the two `4410 - Exterior Trim Labor` lines auto-attached to PO `2025-115E-0004`, even though in the Edit dialog you set Purchase Order = "No purchase…".**  
This is the real bug. `BillPOSummaryDialog` and `useBillPOMatching` both run a **fallback "match by vendor + project + cost_code"** any time a line's `purchase_order_id` is empty. They do not honor the `__none__` sentinel that `EditExtractedBillDialog` writes when you explicitly pick "No PO" — because the value being passed into the matcher is `null/undefined`, not `__none__`.

Where it leaks (`BatchBillReviewTable.tsx`, `billsForMatching` builder):
```ts
bill_lines: (b.lines || []).map((l, idx) => ({
  cost_code_id: l.cost_code_id,
  amount: l.amount,
  purchase_order_id: l.purchase_order_id,   // ← the saved __none__ never gets here
  po_reference: l.po_reference || extLineItems[idx]?.po_reference || null,
}))
```
`pending_bill_lines.purchase_order_id` is a UUID column, so the `__none__` sentinel from the Edit dialog cannot actually be persisted there — it is dropped to `NULL`. The matcher then treats `NULL` as "please auto-match" and silently re-attaches the two trim lines to PO `…0004` because that PO shares the `4410` cost code with the vendor.

So: the user said "No PO", the DB stored `NULL`, and the table viewer auto-matched again. That is exactly why Edit shows 1 PO line and Summary shows 3.

**Symptom C — "Repaper house" row in PO Summary has different font and no cost code.**  
That row's `cost_code_id` resolves through the matcher's "no resolved PO" branch, which renders the description as plain `text-muted-foreground` (italicized-looking, lighter weight) and prints `—` for cost code instead of the saved `4375 – Tyvek Installation`. The cost code IS saved on `pending_bill_lines`; the Summary table just doesn't read it on the "no PO" branch. Pure display bug in `BillPOSummaryDialog`.

### Fix

#### 1. Honor explicit "No PO" across the matcher and the summary dialog
- Add a new column `pending_bill_lines.po_assignment` (text, nullable) with values `'none' | 'auto' | NULL`. When the user explicitly picks "No purchase…" in the Edit dialog, save `po_assignment = 'none'`. When they pick a real PO, save `po_assignment = NULL` and the UUID. (`__none__` / `__auto__` are UI sentinels and must never round-trip through a UUID column.)
- In `EditExtractedBillDialog.tsx` `handleSave`, replace the `sanitizePoId(...)` write with: pass `purchase_order_id = realUuidOrNull` and `po_assignment = (user picked None) ? 'none' : null`.
- In `BatchBillReviewTable.tsx` `billsForMatching`, pass `purchase_order_id = l.po_assignment === 'none' ? '__none__' : l.purchase_order_id`. Same change in `BillsApprovalTable` and `PayBillsTable` for posted bills (they already use `bill_lines`; add the same column there for parity in step 3).
- `useBillPOMatching` and `BillPOSummaryDialog` already short-circuit on `'__none__'`; once the sentinel actually reaches them, the trim labor rows stay unmatched.

#### 2. Stop the cost code / font drift on unmatched rows in PO Summary
In `src/components/bills/BillPOSummaryDialog.tsx`, for the "no resolved PO" branch:
- Render the saved `cost_code_display` (look up `cost_codes.code/name` for `line.cost_code_id`) instead of `—`.
- Drop the `text-muted-foreground` styling on the description cell so the font matches every other row. Match the exact `<TableCell>` className used by the matched rows (`whitespace-nowrap`, regular weight, default text color).

To make the cost code lookup work, extend the `BillLine` interface in this file to include `cost_code_display?: string` and have `BatchBillReviewTable` populate it from `cost_code_name` already on `pending_bill_lines`. No extra fetches.

#### 3. Mirror the same `po_assignment` column on `bill_lines`
After bills are approved out of the pending queue, the same "No PO" intent has to survive into `bill_lines`. Add `po_assignment` to `bill_lines`, copy it from `pending_bill_lines` in the approve-bill path, and apply the same `'none' → '__none__'` translation in `BillsApprovalTable`/`PayBillsTable` `billsForMatching` builders. This is what guarantees Edit ↔ PO Summary ↔ Manage Bills all agree forever.

#### 4. Tighten the AI extraction so $11,568 doesn't collapse to one cost code
In `supabase/functions/extract-bill-data/index.ts`, after the model returns, add a deterministic post-validator:
- If `Math.abs(sum(line_items.amount) - total_amount) > 0.01` AND the source text contains more numeric tokens that look like line totals than the model returned line items, flag the extraction as `needs_review = true` on `pending_bill_uploads.extracted_data` and surface a yellow warning chip in `BatchBillReviewTable`.
- Strengthen the system prompt's "preserve every separately-priced row" rule with one more worked example matching the labor/EXT pattern on this invoice.

This won't make the AI perfect, but it stops a silent $11,568-on-one-line save from looking "approved by default".

### Files touched
- `src/components/bills/EditExtractedBillDialog.tsx`
- `src/components/bills/BillPOSummaryDialog.tsx`
- `src/components/bills/BatchBillReviewTable.tsx`
- `src/components/bills/BillsApprovalTable.tsx`
- `src/components/bills/PayBillsTable.tsx`
- `supabase/functions/extract-bill-data/index.ts`
- DB migration: add `po_assignment text` to `pending_bill_lines` and `bill_lines`; backfill `'none'` for any historical rows where the user clearly chose "no PO" (skipped — only forward-looking).

### Verification on this exact bill (INV0022 @ 115E Ocean Watch)
1. Open Edit Extracted Bill, set lines 2 and 3 to "No purchase…", line 4 cost code = `4375 – Tyvek Installation`, save.
2. Open PO Status Summary: only line 1 (`4470 Siding`) is attached to `2025-115E-0003`; lines 2, 3, 4 all show "No PO", and line 4 shows `4375: Tyvek Installation` in normal font.
3. Approve the bill. Open it from Manage Bills → PO Status Summary still shows the same three "No PO" rows.
4. Re-extract a fresh copy of INV0022: extraction returns 4 separate line items totaling $11,568; if the model collapses, a "needs review" warning appears on the row.

