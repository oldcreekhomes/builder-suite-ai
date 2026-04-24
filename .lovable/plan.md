## Plan

Update the Edit Extracted Bill experience so it mirrors the original invoice presentation instead of exposing one database row per lot.

### What will change
1. Keep the current Cost Code tooltip behavior as-is.
   - No change to the consolidated cost code tooltip.
   - No change to the address tooltip.

2. Rework the Job Cost table in Edit Extracted Bill.
   - Show one visual row per original invoice line, not one row per split lot.
   - Display the original invoice math exactly as entered on the invoice:
     - Quantity: `0.3`
     - Unit Cost: `$425.00`
     - Total: `$127.50`
   - Add a new read-only `Lot Cost` column showing the per-lot share, such as `$6.71 per lot`.

3. Show lot coverage without breaking the invoice row.
   - For split rows, replace the current single-lot selector with an `All N lots` style display.
   - Keep a tooltip/popover listing the included lots so the user can still verify the addresses.

4. Preserve the underlying database structure.
   - The dialog will group split `pending_bill_lines` into one display row when loading.
   - Saving will expand that visual row back into the individual lot rows already expected by approval and accounting logic.
   - The saved child rows will continue to total exactly to the grouped invoice amount, with cent-precise remainder handling.

### Files to update
- `src/components/bills/EditExtractedBillDialog.tsx`
- Possibly a small shared helper inside the same file or bill utilities if the grouping math needs extraction

## Technical details
- Build a grouped display model keyed by the original split siblings, using shared fields such as:
  - `pending_upload_id`
  - cost code/account identity
  - memo/description
  - original rate
  - combined amount
- For grouped display rows:
  - `quantity` = sum of split quantities
  - `unit_cost` = preserved original rate
  - `total` = sum of child amounts
  - `lotCost` = grouped total divided across lots for display
- Do not change the already-correct tooltip aggregation logic in `BatchBillReviewTable.tsx`.
- Keep cent-precise math standards when re-expanding grouped rows to child rows on save.
- Maintain existing PO assignment, vendor, attachment, and validation behavior.

## Result
The dialog will read like the vendor invoice the user sees on the PDF, while still saving the same lot-level accounting records behind the scenes.