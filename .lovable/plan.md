

## Why bid status shows "Draft" and "Sent On" looks empty after sending to RC Fields

### Root cause

There are two different "Send" code paths in bidding:

1. **Send to all companies** — `SendBidPackageModal.tsx`
   - Updates `project_bid_packages.status = 'sent'`
   - Sets `sent_on` if not already set
   - Sets `project_bids.email_sent_at` for each sent company

2. **Send to a single company** (the row-level "Send Email" you just used for RC Fields) — `SendSingleCompanyEmailModal.tsx`
   - Sets `sent_on` only
   - **Does NOT update `status` to `sent`**
   - **Does NOT update the per-vendor `project_bids.email_sent_at`**
   - Only invalidates `['project-bidding']`, not `['all-project-bidding', projectId]` or `['bidding-counts', projectId]`

I confirmed this against the database for "1 East Custis Avenue":

```text
status:  draft        ← wrong, should be 'sent'
sent_on: 2026-04-21 17:05:44 UTC   ← actually present
```

So:
- Resend confirms the email truly was sent.
- The DB actually has a `sent_on` timestamp.
- The package `status` is still `draft`, which is why the row stays under the "Draft" tab and the package still says Draft.
- The "Sent On" column is blank in the UI because the single-company modal does not invalidate `all-project-bidding`/`bidding-counts`, so the table still shows the cached pre-send state until you hard refresh. The DB has the value; the UI just isn't refetching.
- The per-vendor row also isn't recording `email_sent_at`, so RC Fields shows "Not sent" even though they were emailed.

This regression is in the single-company send path, which is the one used from the row's per-company "Send Email" action. The all-companies send path still works correctly.

### Fix plan

Update `src/components/bidding/SendSingleCompanyEmailModal.tsx` so the single-company send mirrors the all-companies send:

1. After a successful email send:
   - Update `project_bid_packages` with:
     - `status = 'sent'`
     - `sent_on = now()` only if not already set (preserve original first-send date)
2. Update the matching `project_bids` row for this company:
   - `email_sent_at = now()`
   - Filtered by `bid_package_id = bidPackage.id` AND `company_id = companyId`
3. Invalidate the right React Query caches so the table refreshes immediately:
   - `['project-bidding', projectId]`
   - `['all-project-bidding', projectId]`
   - `['bidding-counts', projectId]`
   - `['bid-package-companies', bidPackage.id]`

### Backfill the existing 1 E Custis bid package

Update the database record for the bid package that just sent so it reflects reality:

- Set `project_bid_packages.status = 'sent'` for the Civil Engineering package on 1 East Custis Avenue.
- Set `project_bids.email_sent_at` for RC Fields & Associates on that bid package to the actual send time (1:05 PM UTC).

This restores the row to the correct state without re-sending the email.

### Verification after fix

1. The 1 E Custis Civil Engineering package moves from Draft to Sent.
2. The "Sent On" column shows 04/21/2026.
3. The RC Fields row shows the sent timestamp instead of "Not sent".
4. Sending a bid package to a single new company in the future immediately:
   - Moves the package to Sent
   - Records the per-vendor send timestamp
   - Refreshes the table without a manual reload

### Files / changes

1. `src/components/bidding/SendSingleCompanyEmailModal.tsx` — add status update, per-bid `email_sent_at` update, and full query invalidation.
2. One small data backfill for the existing 1 E Custis Civil Engineering bid package and its RC Fields bid row.

No RLS, schema, or edge function changes are required.

