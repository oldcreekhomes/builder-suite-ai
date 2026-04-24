Do I know what the issue is? Yes.

## What is actually broken
1. The dialog is slow because `EditExtractedBillDialog.tsx` fetches cost code names one-by-one inside a loop and also reloads off the polling `pendingBills` query.
2. There is no spinner because the dialog currently has no `isLoading` state or `Loader2` render path.
3. The line items are wrong because the editor is collapsing rows by a guessed key (`cost_code_id + unit_cost + memo + PO`). That can merge distinct invoice lines into one row.
4. The Cost Code and Description fields still use native HTML `title` tooltips instead of the app tooltip component.

## Plan
1. **Make the dialog load immediately and predictably**
   - In `src/components/bills/EditExtractedBillDialog.tsx`, stop depending on `pendingBills?.find(...)` for dialog hydration.
   - Load the selected `pending_bill_uploads` record directly by `pendingUploadId`.
   - Fetch the pending upload, attachments, and pending lines in parallel.
   - Batch all cost code lookups with a single `.in('id', [...])` query instead of one query per line.
   - Remove the `pendingBills` dependency from the dialog-loading effect so the 3-second polling query does not keep retriggering the dialog state.
   - Guard against stale async updates if the dialog closes before the fetch finishes.

2. **Add a real loading state and visible spinner**
   - Add `isLoading` state to the dialog component.
   - Show a centered shadcn-style loading block with `Loader2` and text like “Loading bill…” in the line-item area while the dialog data is being fetched.
   - Keep the existing form hidden or disabled until the data is ready so the user does not watch fields populate slowly.

3. **Fix the wrong line items first by removing unsafe inferred grouping**
   - Stop using the current `buildJobCostDisplayLines()` collapse logic for the editable table.
   - Render the actual saved `pending_bill_lines` rows in the editor so every extracted line appears correctly.
   - Keep quantity, unit cost, total, lot, and PO editing working per row.
   - This prioritizes correctness over compactness and avoids merging unrelated lines.

4. **Restore application tooltips**
   - Remove the native `title` attributes from the Cost Code cell, Description cell, and Description input.
   - Wrap the truncated Cost Code and Description controls with the existing shadcn `Tooltip`, `TooltipTrigger`, `TooltipContent`, and one surrounding `TooltipProvider`.
   - Only show tooltips when those fields actually have content.

5. **Sanity check related behavior**
   - Verify the address/lot column still renders correctly for split lines.
   - Make sure auto-PO matching still works with raw rows.
   - Keep the current save path intact so no approval/accounting logic changes.

## Technical details
- Primary file: `src/components/bills/EditExtractedBillDialog.tsx`
- Related file to review during implementation: `src/hooks/usePendingBills.ts`
- Important current bottlenecks:
  - sequential cost code fetch at the line-load loop
  - `useEffect(..., [open, pendingUploadId, pendingBills])`
  - native tooltip usage on the cost code and description fields
  - guessed grouping logic that has no durable split-group identifier

## Expected result
- Dialog opens with an immediate loading indicator.
- Load time drops because the expensive per-line round trips are removed.
- Users see the correct number of line items.
- Cost Code and Description use app tooltips, not browser HTML tooltips.

Approve and I’ll implement this exact fix pass.