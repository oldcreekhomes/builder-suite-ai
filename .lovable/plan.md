# Multiple Checks: title type toggle, remove per-row Type, restore row Actions

Update the Multiple Checks entry table so the cost-code vs account choice is controlled from the card title instead of a per-row column, and bring back a row-level Actions menu.

## What changes

1. **Remove the per-row "Type" column** entirely.
2. **Add a dropdown in the card header** (beside Default Date / Total / Actions) that switches the whole table between **Cost Code** and **Account**. It defaults to **Cost Code**.
   - When the user changes this dropdown, every row's `entryType` updates to the chosen value and any already-selected cost code or account is cleared so a stale value cannot be saved.
3. **Keep one combined "Cost Code / Account" column** that renders `CostCodeSearchInput` when the table is in Cost Code mode and `AccountSearchInputInline` when in Account mode.
4. **Restore the Actions column at the far right** using the standard `TableRowActions` three-dot menu with a **Delete** option. Delete is disabled when only one row remains.
5. **Validation** continues to require a cost code in Cost Code mode and an account in Account mode.
6. **No database or save-hook changes** — `useMultiCheckBatchSave.ts` already supports both `job_cost`/`cost_code_id` and `expense`/`account_id` lines.

## Files touched

- `src/components/multi-entry/MultiCheckTable.tsx` — header toggle, remove Type column, re-add Actions column.
