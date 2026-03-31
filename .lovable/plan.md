

## Fix Send Bid Package Modal — Readability, Colors, and Selection Logic

### Problems Identified

1. **All companies show as "Already sent"** — The fallback logic `|| !!bidPackage?.sent_on` treats every company (including newly added ones like City Concrete and LCS) as already sent. Since the backfill migration already set `email_sent_at` on genuinely-sent rows, this fallback is now counterproductive.

2. **Company cards are too cramped** — The `max-h-48` on the grid and small text/padding make the recipients section unreadable.

3. **No color distinction** — "Already sent" is plain muted text; needs red for sent, green for not-yet-sent.

4. **No companies are checked** — Because the fallback marks everything as sent, nothing gets auto-selected.

### Fix

**File: `src/components/bidding/SendBidPackageModal.tsx`**

1. **Remove `bidPackage?.sent_on` fallback** everywhere — only use `company.email_sent_at` to determine sent status. The backfill already populated this field for all pre-existing sent rows.

   Lines affected:
   - Line 88: `const wasSent = company.email_sent_at;` (remove `|| packageAlreadySent`)
   - Line 84: Remove `const packageAlreadySent = ...`
   - Line 182: `if (company.email_sent_at) {` (remove `|| bidPackage?.sent_on`)
   - Line 451: `const alreadySent = !!company.email_sent_at;`
   - Line 452: `const sentDate = company.email_sent_at;`

2. **Increase readability of company cards**:
   - Change `max-h-48` to `max-h-64` on the grid container (line 441)
   - Increase card padding from `p-2` to `p-3`

3. **Color the sent status labels**:
   - Already sent: red text (`text-red-600 font-medium`)
   - Not yet sent: green text (`text-green-600 font-medium`) showing "Not yet sent"

4. **Auto-check companies that have NOT been sent** — this already works correctly once the fallback is removed. Companies with `email_sent_at = NULL` get checked.

### Result
- Newly added companies (no `email_sent_at`) are auto-checked and show green "Not yet sent"
- Previously sent companies are unchecked and show red "Already sent on {date}"
- Cards are more readable with more space
- The "Already sent on" dates are real (from the backfill)

