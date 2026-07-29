## Why Lot 2 won't delete

Verified in the database:

- Lot 2 (`5d2f8419…`) still exists on 214 N Granada.
- All the visible cost tables are clean — 0 rows on Lot 2 in bills, bill lines, journal entry lines, check lines, deposit lines, credit card lines, budgets, and purchase orders.
- **12 rows in `pending_bill_lines` (the ML bill-upload staging table) still point to Lot 2**, across 7 already-approved uploads (RC Fields invoices, ELG Consulting, 260730 Granada).

That table's foreign key to `project_lots` is `NO ACTION`, so Postgres refuses the delete. The app catches the error and shows only a generic "Failed to delete lot" toast, which is why it looks like nothing happens.

## Fix

1. **Data cleanup:** repoint those 12 `pending_bill_lines` rows from Lot 2 to Lot 1 (`bc4bf662…`), matching what we already did for the real bill lines.
2. **Delete Lot 2** from `project_lots` and verify zero references remain anywhere.
3. **Make failures visible (code):** in `src/hooks/useLots.ts`, have `deleteLot` show the actual database error text in the toast instead of a generic message, and detect the foreign-key violation case (`23503`) to say plainly that the lot still has costs/records attached and cannot be deleted.

## Technical details

- Tables checked against Lot 2: `bills`, `bill_lines`, `project_budgets` (both `lot_id` and `historical_lot_id`), `project_purchase_orders`, `journal_entry_lines`, `check_lines`, `credit_card_lines`, `deposit_lines`, `pending_bill_lines`, `recurring_transaction_lines`. Only `pending_bill_lines` had rows.
- RLS on `project_lots` allows the delete for owners/confirmed employees, so permissions are not the blocker.
- No schema/foreign-key changes proposed — leaving the FK as `NO ACTION` keeps it impossible to orphan cost records by deleting a lot.
