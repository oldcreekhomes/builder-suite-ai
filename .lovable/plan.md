## Problem

The Kempsville bill (`IN48000495861`) has `total_amount = $0.00` and a single line with `unit_cost = $0.00`. Approving it calls `postBill`, which tries to insert journal entry lines with both debit and credit equal to 0. The DB constraint `journal_entry_lines_check` requires `debit > 0` or `credit > 0`, so Postgres rejects the insert and the UI shows the generic "Failed to approve bill" toast with no detail.

## Fix

Two small, surgical changes in `src/hooks/useBills.ts`:

1. **Preflight in `approveBill`** (around line 252): before calling `postBill.mutateAsync`, fetch `bills.total_amount` for `billId`. If it is `null`, `0`, or negative, throw a clear error:
   > "Cannot approve a $0.00 bill. Open the bill, set the line amounts, then try again."

2. **Surface real errors** in the `approveBill` `onError` (line 303): replace the hard-coded `"Failed to approve bill"` with `error.message || "Failed to approve bill"` so any underlying DB error (constraint, RLS, etc.) is visible to the user, matching the pattern already used in `postBill`'s onError just above.

No DB migration, no change to bill posting logic, no other components touched.

## How the user unblocks the Kempsville bill

After the fix, they will see the clear $0 message. They open the bill via Edit Extracted Bill, set the correct unit cost / amount on the line, save, then approve. The bill posts normally.
