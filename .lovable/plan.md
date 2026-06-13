Plan to fix the Edit Check dialog:

1. Remove the top-level Memo section entirely
   - Delete the separate Memo label/input area shown between the header fields and the Expenses/Job Cost tabs.
   - Stop saving that top-level memo from this dialog so it does not reappear from this UI.

2. Restore line-item description layout
   - Keep Description as the line-item field, not Memo.
   - Rebalance the row grid so Account, Amount, Description, and Action have even visual spacing.
   - Ensure Description fills the empty space before Action instead of leaving a large blank gap.

3. Restore row controls
   - Remove the visible “Add Row” button text.
   - Replace it with a compact plus icon button placed in the Action area beside the delete/trash button.
   - Keep the existing add-row behavior, only change the placement and appearance.

4. Restore input height
   - Increase Account, Amount, Description, and Address inputs/selects from the current short height to match the height of the memo field being removed.
   - Apply the same height consistently across expense and job-cost rows.

Technical details:
- Update only `src/components/checks/EditCheckDialog.tsx`.
- No database, accounting logic, report logic, or save-line-item behavior changes.
- Preserve existing `check_lines.memo` storage behind the line-item Description field, since the database field is still named memo while the UI label should be Description.