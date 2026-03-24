

## Hybrid Late Bid Submission: Warn on Late, Block on Closed

### What changes

**1. Database migration** -- add `submitted_late` column to `project_bids`
```sql
ALTER TABLE project_bids ADD COLUMN submitted_late boolean DEFAULT false;
```

**2. Edge function: `supabase/functions/submit-bid/index.ts`**
- Change query from `select('due_date')` to `select('due_date, status')`
- Add hard block: if `status === 'closed'`, return `{ error: 'bid_package_closed' }` with 400 status
- Replace the due date hard block with a soft check: compute `isLate` boolean, include it in `updateData` as `submitted_late`, and return `submitted_late` in the success response
- Remove the redirect-to-declined logic for past due dates

**3. Frontend: `src/pages/SubmitBid.tsx`**
- Add a computed `isPastDue` check using `bidPackage.due_date`
- Add a computed `isClosed` check using `bidPackage.status === 'closed'`
- If closed: show a blocked message ("This bid package has been closed and is no longer accepting submissions") instead of the form, with a link to bid-declined
- If past due but not closed: show a yellow warning banner above the form: "This bid is past the due date. Your submission will be marked as late."
- Update error handling: handle `bid_package_closed` error by redirecting to `/bid-declined?reason=closed`

**4. Frontend: `src/pages/BidDeclined.tsx`**
- Read `reason` query param
- If `reason=closed`: show "This bid package has been closed and is no longer accepting submissions."
- Otherwise keep existing due date message

### Files modified
- New migration SQL (1 statement)
- `supabase/functions/submit-bid/index.ts`
- `src/pages/SubmitBid.tsx`
- `src/pages/BidDeclined.tsx`

