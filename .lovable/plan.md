
## Goal

Fix the missing `bill_payments` records causing the Paid tab to misrepresent payments, and prevent it from happening to future single-bill payments.

## Steps

### 1. Audit — find every orphan bill payment JE

Run a one-time read-only query to list all `journal_entries` of `source_type='bill_payment'` that have **no matching `bill_payments` row** for their bill + entry_date. For each, capture:

- `journal_entry.id`, `entry_date`, `owner_id`, `description`
- `bill_id` (= `source_id`), vendor_id, project_id, owner_id (from the bill)
- Cash side: `payment_account_id` = the non-A/P account on the JE credit line
- `amount` = sum of debits to the A/P account on that JE (the payment amount)
- Skip pure credit-application JEs that touch only A/P on both sides (already accounted for by the credit-application flow)
- Skip JEs already reversed (`reversed_at is not null`) and reversal JEs themselves (`is_reversal = true`)

### 2. Backfill — insert missing `bill_payments` + allocations

For each orphan from step 1, insert via a migration (one SQL statement so it's transactional):

```text
INSERT INTO bill_payments (id, owner_id, payment_date, payment_account_id,
                           vendor_id, project_id, total_amount, memo,
                           created_by, created_at)
SELECT ... FROM the audit set

INSERT INTO bill_payment_allocations (bill_payment_id, bill_id, amount_allocated)
SELECT ... matching the new bill_payments.id
```

Use the JE's `id` as a stable suffix in the memo (e.g. `'Backfilled from JE <uuid>'`) so we can identify them later. Reuse `je.created_by` (or fall back to `owner_id`) for the `created_by` column.

After this is applied:
- The OW $28,244.90 Apr 14 payment will appear on the Paid tab as a standalone row.
- All other orphaned cash payments across the project will likewise appear.
- The May 15 $0 credit-application row will continue to display as-is (correctly).

### 3. Prevent recurrence — fix `payBill` mutation

In `src/hooks/useBills.ts` (single-bill `payBill` mutation, lines ~764–897), after the existing `bills` update, mirror what `payBills` already does for the consolidated group:

- Insert a row into `bill_payments` with `total_amount = amountToPay`, `vendor_id`, `project_id`, `payment_account_id`, `payment_date`, `memo`, `owner_id`, `created_by`.
- Insert one row into `bill_payment_allocations` with `amount_allocated = amountToPay`.
- Wrap in try/catch so a failure to write the consolidated record logs an error but does not roll back the already-posted GL entry (consistent with `payBills`).

No UI changes needed — the Paid tab automatically picks up new `bill_payments` rows.

### 4. Verify

After the migration runs:
- Re-query the OW bill: confirm one `bill_payments` row for $28,244.90 dated 2026-04-14 with its allocation, plus the existing May 15 $0 credit-application row.
- Re-run the audit query and confirm it returns zero rows.
- Open Manage Bills → Paid for the project and confirm both payments show up correctly.

## Files / changes

- One Supabase **migration** that runs the backfill INSERTs.
- Edit **`src/hooks/useBills.ts`** — add the bill_payments + allocations insert to the single-bill `payBill` mutation.
- No UI/component changes.
