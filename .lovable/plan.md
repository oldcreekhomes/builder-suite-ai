## Restore detailed invoice line-item breakout for AI-extracted bills

**Goal:** Keep structured invoices like the uploaded WIRE GILL LLP bill broken into separate editable lines in Review/Edit Bill, instead of collapsing them into one summary row. Approval should continue copying those lines into posted bills unchanged.

### What is happening now
- The approval path is not the problem. `approve_pending_bill` copies `pending_bill_lines` to `bill_lines` line-for-line.
- The regression is happening earlier in `supabase/functions/extract-bill-data/index.ts`.
- When extracted `line_items` do not sum closely enough to `total_amount`, the function currently falls back to a single line like `"Vendor - Invoice"`.
- The existing recovery only handles descriptions that already contain embedded `description - $amount` patterns. It does not recover table-style invoices like the uploaded legal invoice, where each row has its own Date / Attorney / Notes / Quantity / Rate / Total columns.

### Implementation plan

1. **Add a structured-table recovery pass in `extract-bill-data`**
   - Before collapsing to one line, inspect the extracted PDF text for table rows that look like real invoice detail lines.
   - Support patterns like the uploaded invoice:
     - `Date | Person | Notes | Quantity | Rate | Total`
     - multiple rows with their own dollar totals
   - Build separate `line_items` from those rows using the row note text as the description/memo, the row quantity, the row rate, and the row total.

2. **Use the recovered rows only when they are trustworthy**
   - Accept the recovery only when it finds 2+ rows and the reconstructed total is within a tight tolerance of the invoice total.
   - Preserve the current existing inline-description recovery (`desc - $amount`) as a first recovery path.
   - Only use the single-line collapse as the last-resort fallback.

3. **Preserve per-line categorization after recovery**
   - Run the existing cost-code auto-assignment against each recovered row individually.
   - Keep the current per-vendor cost code behavior and PO matching inputs unchanged.

4. **Keep the editor behavior aligned with the recovered lines**
   - No change to approval RPC logic.
   - No change to the grouped-by-lot visual behavior in `EditExtractedBillDialog`; once the extracted lines are restored correctly, the editor should again show the proper line breakout before any lot grouping.
   - Verify `pending_bill_lines` insertion still stores each recovered row separately and in invoice order.

5. **Guard against future regressions**
   - Add a focused extraction regression test or fixture around a table-style invoice case like this one.
   - Validate that a structured invoice with 7 rows stays 7 rows, while genuinely broken extractions can still fall back safely.

### Files likely to change
- `supabase/functions/extract-bill-data/index.ts`
- Possibly a nearby test/fixture file if the project already has extraction test coverage for edge functions

### Technical details
- Current collapse logic lives in `extract-bill-data` around the `shouldCollapseAfter` decision.
- Current approval logic in `supabase/migrations/20260422222647_e0b0fa45-7385-4b16-b81b-90618bb06edf.sql` already copies `pending_bill_lines` into `bill_lines` correctly.
- The uploaded PDF contains a clear tabular breakdown with 7 rows totaling $1,402.50, so this should be handled as a multi-line invoice, not a single summary line.

### Expected result
- In Review/Edit Bill, this invoice shows separate line items again.
- When approved, those separate lines carry through to the posted bill.
- The one-line `"Vendor - Invoice"` fallback only appears for truly unrecoverable extractions, not valid structured invoices.