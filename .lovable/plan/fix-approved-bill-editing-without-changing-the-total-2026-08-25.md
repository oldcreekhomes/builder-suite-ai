# Fix approved-bill editing without changing the total

## Goal
Make approved, posted, and paid bills editable only for:
- Bill date
- Cost code
- Line description
- Equal division across the project’s lots

The original bill total must remain unchanged, and every saved change must also update the linked journal entry.

## Implementation
1. **Add one atomic database operation for approved bills**
   - Accept the permitted header and line-allocation changes in one transaction.
   - Verify the bill belongs to the current user’s company and has an approved/posted/paid status.
   - Lock the bill during the update and reject any request whose line total differs from the original total by even one cent.
   - Replace the affected bill-line allocation when a single line is divided across lots, including the cent remainder on the final lot.
   - Update the matching journal-entry lines in the same transaction, preserving the original debit/credit direction and exact total.
   - Update the journal-entry date when the bill date changes.
   - Roll back the entire save if any bill or journal update fails, so partial accounting changes cannot occur.

2. **Connect the Edit Bill dialog to the atomic operation**
   - Send both existing and newly split rows instead of silently dropping rows without database IDs.
   - Preserve cent-precise amounts and verify the displayed total equals the bill’s stored total before saving.
   - Keep quantity and unit cost read-only; the divide action is the only approved way to alter the allocation shape.
   - Refresh bill, job-cost, accounting, and bill-list queries immediately after success.
   - Surface the real database error instead of showing a false success.

3. **Enforce the approved-bill field restrictions in the UI**
   - Leave only date, cost code, description, and equal-lot division editable.
   - Disable vendor, reference number, due date, terms, account, quantity, unit cost, purchase-order assignment, notes, and attachment changes for approved/posted/paid bills.
   - Update the dialog guidance to state the exact allowed fields.

4. **Verify the reported Nob Hill bill**
   - Confirm Home Depot invoice `46035158068` remains exactly **$25.66**.
   - Divide it across all 19 current Nob Hill lots, with cent-precise remainder handling.
   - Confirm the description and cost code persist after reopening the dialog.
   - Confirm the linked journal entry has the same date, cost code, description, lot allocation, and exact **$25.66** total.

## Technical details
- Implement the database change through a Supabase migration/RPC; do not perform multi-step line deletion/insertion from the browser.
- Preserve tenant isolation and existing RLS expectations inside the security-definer operation.
- Use integer-cent validation for the invariant: `sum(updated lines) = original bill total`.
- Keep the accounts-payable journal line unchanged except for the journal-entry date; only the bill’s expense/job-cost side is reallocated.
