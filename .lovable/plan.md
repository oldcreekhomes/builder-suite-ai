

## Add Per-Company Send Tracking + Checkboxes to Send Bid Package Modal

### What Changes

When opening "Send Bid Package," each company gets a checkbox. Companies that have already been sent the bid package are **unchecked by default** with a label like "Already sent on Mar 31". New companies are **checked by default**. The user can re-check previously-sent companies to resend.

Only checked companies are included in the email send.

### Database Change

Add an `email_sent_at` column to `project_bids`:

```sql
ALTER TABLE project_bids ADD COLUMN email_sent_at timestamptz DEFAULT NULL;
```

After a successful send, update `email_sent_at = NOW()` for each company that was included.

### UI Changes — `src/components/bidding/SendBidPackageModal.tsx`

1. **Add `selectedCompanyIds` state** — initialized from loaded data:
   - Companies where `email_sent_at IS NULL` → checked (selected)
   - Companies where `email_sent_at IS NOT NULL` → unchecked

2. **Add checkboxes to each company card** in the recipients grid:
   - Checkbox toggles company in/out of `selectedCompanyIds`
   - For already-sent companies, show a small muted label: "Sent on {date}"
   - Visual distinction: already-sent cards have a subtle border/background difference

3. **Filter `emailData.companies`** to only include companies in `selectedCompanyIds`

4. **Update recipient count** to reflect only checked companies' reps

5. **After successful send**, update `email_sent_at` on each sent company's `project_bids` row:
   ```ts
   await supabase.from('project_bids')
     .update({ email_sent_at: new Date().toISOString() })
     .eq('bid_package_id', bidPackage.id)
     .in('company_id', sentCompanyIds);
   ```

6. **Send button label** updates dynamically: "Send to 3 companies" or "Send to 2 new, 1 resend"

### Type Update — `src/integrations/supabase/types.ts`

Add `email_sent_at` to `project_bids` Row/Insert/Update types.

### Files Changed
- **Migration** — add `email_sent_at` column to `project_bids`
- `src/components/bidding/SendBidPackageModal.tsx` — checkboxes, filtering, post-send update
- `src/integrations/supabase/types.ts` — add `email_sent_at` field

### Result
- New companies auto-checked, already-sent ones unchecked with sent date shown
- User must explicitly re-check to resend, preventing accidental duplicate emails
- Per-company send history persisted in the database

