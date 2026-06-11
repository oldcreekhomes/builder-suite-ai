# Cascade-delete payments when deleting a bill

## Problem
Clicking Delete on a paid bill throws: "Cannot delete this bill because it has a recorded payment. Void or delete the payment first..." This guard lives in the Postgres RPC `delete_bill_with_journal_entries`. The user wants one click to remove the bill and its payment together (with proper GL reversal), as long as nothing is reconciled.

## Fix
Update the RPC `public.delete_bill_with_journal_entries(bill_id_param uuid)` so that, instead of blocking when `bill_payment_allocations` exist, it cascades the cleanup:

1. Keep the existing hard-stop when the bill (or any linked payment) is reconciled — reconciled payments must still be unreconciled first.
2. For each `bill_payment_allocations` row tied to this bill:
   - Find the parent `bill_payments` row.
   - Delete its journal entries (`journal_entry_lines` then `journal_entries` where `source_type = 'bill_payment'` and `source_id = bill_payments.id`).
   - Delete the `bill_payments` row. The allocation row cascades via the existing `ON DELETE CASCADE` FK; if the payment covered other bills, those allocations are also removed and we additionally roll back `bills.amount_paid` / `status` on any sibling bills the payment touched so they return to posted/open.
3. Then proceed with the existing bill JE + bill_lines + bill_attachments + bill delete.
4. Also block (with a clear message) when any linked `bill_payments.reconciled = true`, not only the bill row itself, so partially-reconciled payments aren't silently torn down.

All work happens inside the existing SECURITY DEFINER function, so it stays atomic in a single transaction.

## Scope
- One migration updating the RPC. No frontend changes — `BillsApprovalTable` already calls this RPC, so the Paid tab Delete action starts working immediately.
- No schema changes, no new tables, no RLS changes.

## Out of scope
- Voiding vs deleting UI for standalone payments (Bank Register flow) — unchanged.
- Reconciled payments — still blocked with an explanatory error.
