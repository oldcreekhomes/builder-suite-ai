# Complete the Multiple Checks summary and show cents

## Changes

1. **Show cents on every entered amount.** Waterloo’s unsplit amount currently displays the raw typed value, whereas split checks display two decimals. Format all valid amounts to two decimal places when leaving the field—`5100` becomes `5100.00`—without interfering with typing or changing the amount. Saved summary amounts already use two-decimal currency formatting; preserve that.

2. **Match the expanded saved summary to the entry fields**, in the same order:
   - Project
   - Date
   - Pay From (Bank)
   - Pay To
   - Check #
   - Cost Code / Account
   - Description
   - Amount
   - Address
   - Files

3. **Add the missing saved details.** Read each saved check’s detail lines to display its actual cost code/account and allocated addresses. Keep one row per check; multiple lots show `+N` with the same per-lot amount breakdown on hover. Show attached files using the existing file viewer and download controls. No attachments or allocations display a dash. Existing batches receive these details too, wherever stored.

4. **Keep it compact and consistent.** Use the existing table styling, fixed column widths, truncated long text with full-text hover, and horizontal scrolling when necessary. File clicks open the viewer rather than navigating to the check. Preserve existing check navigation and batch totals, locks, and deletion behavior. Both dashboards continue using the same screen.

## Technical details

- Update `MultiCheckTable.tsx` amount blur formatting.
- Extend `useMultiCheckBatches.ts` with batched, company-access-scoped lookups of saved check lines, cost codes/accounts, lots, and attachments; reuse existing project account-name resolution and file-viewer patterns.
- Update `MultiCheckBatchHistory.tsx` to render all entry fields from saved data. No changes to accounting entries, amounts, permissions, or database structure.

## Verification

- Confirm Waterloo shows `5100.00` after leaving the amount field and `$5,100.00` in its saved summary.
- Check a single-lot and a 19-lot check: correct account/cost code, full check total, lot-count breakdown, and file viewing/downloading.
- Confirm all ten summary fields appear and older batches still expand correctly.
- Run focused allocation/formatting checks and confirm the application compiles. If signed-in testing remains unavailable, state that limitation explicitly.