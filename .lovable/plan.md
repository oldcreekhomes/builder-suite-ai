
I traced the issue and confirmed why this keeps happening:

1) The “Use Our Template” import path calls the edge function `copy-template-accounts` from `ChartOfAccountsTab.tsx`.
2) In `supabase/functions/copy-template-accounts/index.ts`, the hardcoded template still defines Retained Earnings as code `"32000"` (line 23), so every fresh template import recreates it as 32000.
3) Your live Dorian Gray Homes dataset also currently has Retained Earnings = `32000` (account id `1866a363-ae41-4f9b-aa81-828c06d05ecf`), so it needs a one-time data correction too.

Implementation approach (to satisfy both immediate and future behavior):

## A) Fix future imports (source of truth)
- Update `supabase/functions/copy-template-accounts/index.ts`:
  - Change template entry:
    - from: `{ code: "32000", name: "Retained Earnings", ... }`
    - to:   `{ code: "3200",  name: "Retained Earnings", ... }`
- Deploy the updated `copy-template-accounts` edge function so new imports use 3200.

## B) Fix current Dorian data now
Because your org already imported the template, apply a one-time data update for that owner:
- Update `accounts.code` from `32000` to `3200` for owner `3e482bbc-139c-4ebc-a006-d9290287d2d5` and account name “Retained Earnings”.
- Preferred safe WHERE filter:
  - `owner_id = '3e482bbc-139c-4ebc-a006-d9290287d2d5'`
  - `name = 'Retained Earnings'`
  - `code = '32000'`

I will execute this with a temporary admin edge function (service role), run it once, verify the result, then remove the temporary function.

## C) Verification checklist
After deployment + one-time update:
1. Query Dorian’s accounts and confirm Retained Earnings now shows `3200`.
2. In UI `/settings?tab=chart-of-accounts`, confirm Retained Earnings displays 3200.
3. Delete COA and re-import using “Use Our Template” to confirm fresh imports now create 3200 (not 32000).

## Edge cases I will guard against
- If a `3200` Retained Earnings already exists for the same owner, skip update to avoid duplicate-code conflicts.
- If no matching `32000` row exists, return a “no-op” success response instead of failing.
- Keep scope strictly to Dorian’s owner_id so other builders are unaffected.

## Expected outcome
- Immediate: Dorian Gray Homes Retained Earnings code becomes 3200.
- Going forward: every “Import Chart of Accounts” template import creates Retained Earnings as 3200 by default.
