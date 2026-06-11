## Root cause

The "Failed to complete reconciliation" error is being thrown by a Postgres trigger, not by your data. When the app updates `bank_reconciliations.status` to `completed`, the trigger `sync_reconciliation_row_flags` fires and tries to update the `credit_cards` table using a column called `bank_account_id`. That column does not exist on `credit_cards` (the real column is `credit_card_account_id`), so Postgres raises:

```
ERROR: column "bank_account_id" does not exist
```

The Supabase Postgres logs confirm this — the error fires every time you click **Finish Reconciliation**. Because the trigger raises, the whole `UPDATE bank_reconciliations ... SET status='completed'` is rolled back, the React mutation rejects, and the UI surfaces the generic toast you're seeing. Nothing is wrong with the Oceanwatch data or the $0.00 difference — the bug exists for every project that uses this trigger.

## Fix

Patch the trigger function `public.sync_reconciliation_row_flags()` so the two `UPDATE public.credit_cards ...` statements use the correct column. Credit-card reconciliations identify the account via `credit_card_account_id`, so the comparison should be `credit_card_account_id = NEW.bank_account_id` (the column on `bank_reconciliations` is named generically — it holds whatever account is being reconciled). One migration, two tiny edits inside the existing function, no schema/RLS/data changes.

After the migration the user can re-click **Finish Reconciliation** on the April 30 statement and it will complete normally.

## Technical details

- File: new migration that runs `CREATE OR REPLACE FUNCTION public.sync_reconciliation_row_flags()` with the same body it has today, except:
  - In the "removed_ids" block: `UPDATE public.credit_cards ... WHERE id = ANY(removed_ids) AND reconciliation_id = NEW.id` — already correct, no `bank_account_id` clause to remove there.
  - In the "added ids" block: change `AND bank_account_id = NEW.bank_account_id` to `AND credit_card_account_id = NEW.bank_account_id`.
- Keep `SECURITY DEFINER` and `SET search_path = public`.
- No frontend changes.

## Out of scope

- The autosave / `bill_payments` cascade work from earlier turns — untouched.
- UI copy for the error toast — the underlying error is fixed so the toast won't fire on success.