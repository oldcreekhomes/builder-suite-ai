## One-Time Database Update — No Code/UI Changes

**Target bid package:**
- Project: `b967fc5a-6ac6-4129-afe7-b67d51a5db05` (214 Coronado)
- Cost code: `2050 - Civil Engineering`
- Bid package ID: `b61bf504-5502-4c92-962b-84552ca8ed47`
- Current status: `closed` → New status: `sent` (so it appears in the "Bidding" tab)

### SQL
```sql
UPDATE public.project_bid_packages
SET status = 'sent', updated_at = now()
WHERE id = 'b61bf504-5502-4c92-962b-84552ca8ed47';
```

### Notes
- No code, UI, or schema changes.
- No emails sent — this is a direct DB status flip only.
- `sent_on`, `due_date`, and `reminder_date` are preserved.
- Associated `project_bids` rows are not touched.

After approval, I'll run the update via a migration and verify the row's new status.