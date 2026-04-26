I found the specific inconsistency now:

- The uploaded RC Fields bill rows are already linked to the correct PO and correct PO lines.
- Those PO lines have the correct cost codes:
  - Expanded Housing Option → 2030 Entitlement Engineering
  - Stormwater and Environmental Management → 2050 Civil Engineering
- But the pending bill rows still store/display `2000 - SOFT COSTS` as their own `cost_code_id/cost_code_name`.
- The PO dialog is using the PO line link to show the right PO context, while the main table and Edit Extracted Bill dialog are reading the stale bill-line cost code. That is why they disagree.

Plan to fix this cleanly without creating separate dialogs:

1. Make matched PO lines authoritative for cost codes
   - Anywhere a pending bill line has `purchase_order_line_id`, load that PO line's `cost_code_id`.
   - Overwrite the pending bill line's `cost_code_id` and `cost_code_name` with the PO line cost code.
   - This applies even if the AI already guessed a different cost code like `2000`.

2. Fix extraction-time snapping
   - In `extract-bill-data`, change the existing PO snap logic from “only inherit the PO cost code if the bill line has no cost code” to “always use the matched PO line’s cost code.”
   - This prevents new uploads from saving stale AI guesses when a PO line match exists.

3. Fix rematch/repair snapping for bills already in the queue
   - In `rematch-pending-bill`, when a project/vendor PO match is found, match pending bill descriptions against PO line descriptions.
   - If a PO line is matched, update all of these together:
     - `purchase_order_id`
     - `purchase_order_line_id`
     - `po_assignment = 'auto'`
     - `cost_code_id`
     - `cost_code_name`
   - This will repair the currently uploaded RC Fields bill as well as future “try again” cases.

4. Fix Edit Extracted Bill auto-match behavior
   - In `EditExtractedBillDialog`, when the auto-matcher identifies a PO line, replace the row’s cost code with the PO line’s cost code instead of only filling it when blank.
   - Ensure the display string is formatted consistently as `2030: Entitlement Engineering` / `2050: Civil Engineering`.

5. Fix the main review table display refresh
   - After the automatic PO snap/rematch finishes, refresh pending bill lines and PO matching data so the row immediately updates from `2000` to the PO-derived codes.
   - Keep the PO Status badge and Cost Code column reading from the same corrected pending bill line data.

6. Keep user manual choices protected
   - Do not overwrite a line if the user explicitly selected “No purchase order.”
   - Do not override a manually selected cost code unless the line is linked to a real PO line; in that case, the PO line is the source of truth because the bill is being matched against that PO.

Technical files to update:
- `supabase/functions/extract-bill-data/index.ts`
- `supabase/functions/rematch-pending-bill/index.ts`
- `src/components/bills/EditExtractedBillDialog.tsx`
- `src/components/bills/BatchBillReviewTable.tsx`
- Possibly `src/utils/poLineMatching.ts` only if the display-name format needs a small helper adjustment

Expected result:
- PO dialog, main Enter With AI table, and Edit Extracted Bill all show the same cost code once a PO line match exists.
- The current RC Fields bill will show 2030 and 2050 instead of 2000 for the matched lines.
- Future uploads for project-scoped POs will not preserve generic AI guesses when exact PO line descriptions identify the correct code.