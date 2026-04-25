## Backfill `sent_at` for Existing Purchase Orders

All 500 existing rows in `project_purchase_orders` currently have `sent_at = NULL`, so they display "Not sent" in the new column. Since these POs were already emailed at creation time, we'll set `sent_at` equal to `created_at` for every existing row.

### Migration
```sql
UPDATE public.project_purchase_orders
SET sent_at = created_at
WHERE sent_at IS NULL;
```

### Impact
- Updates 500 existing PO rows.
- The "Sent On" column will now show the original creation date for all historical POs.
- New POs going forward continue to be stamped with the actual send timestamp by the code already in place.

### Files
- New migration file under `supabase/migrations/` containing the UPDATE above.

Reply **approve** to apply the backfill.