

## Investigate the remaining $7,998.71 A/P Aging gap

### What the data says
Verified in the live DB for project `494d10f1-…` as of 02/28/2026:

- GL on account 2010, project-scoped, with the canonical reversal filter = **$161,894.60** ✅ (matches Balance Sheet)
- 149 active bills, 28 in the 1-30 bucket totaling **$160,971.95**, 1 in 31-60 ($200), 2 in 61-90 ($722.65) — sum = **$161,894.60**
- All 269 GL lines have the correct `project_id` populated
- Every GL `source_id` maps cleanly to one of the 149 active bills (no orphans, no negatives, no zeros)

After the last fix the report shows **$153,895.89** — exactly $7,998.71 short. The credit-memo bug ($500) was fixed. Something else is silently dropping ~$8K of bills from the rendered list.

### Likely cause
One of these is silently zeroing out a handful of bills in the new GL-derived open-balance map, after which the "openBalance > $0.01" filter at line 248 quietly removes them:

1. **`journal_entry_lines.project_id` race**: a bill's credit line has `project_id = null` for a few entries (only payment debits do, which would *raise* the open balance, not lower it). Confirmed not the cause for this dataset, but worth guarding.
2. **Date-string parsing**: `asOfDate.toISOString().split('T')[0]` shifts to UTC. For users west of UTC late in the day this can move the as-of cutoff back a day, dropping any JEs dated on `asOf`. Balance Sheet uses the same trick, so it would still tie — unless the bill list query (which uses the same string) drops bills the GL keeps, or vice versa.
3. **`maybeSingle()` on accounts with code `2010`**: there are TWO rows with code=`2010` (one per home builder) globally. RLS scopes per user, but `maybeSingle()` will THROW if RLS ever returns >1 row for cross-tenant employees / accountants. Should be `.eq('owner_id', …).single()` or filtered through the same `home_builder_id` the bills query already implies.
4. **An active bill with no GL entry hitting account 2010** (e.g. legacy bills imported before the JE writer existed). They'd appear with `openGL = 0` and get filtered out, even though the bill table still says they're unpaid.

### Fix (one file, two passes)
`src/components/reports/AccountsPayableContent.tsx`

**Pass 1 — instrument and surface the diff (immediate):**
- After computing `glNet` and `grandTotal`, log a structured diagnostic to the console with: total bill count, sum of `bill.total_amount - bill.amount_paid` (legacy method), sum of GL-derived open balances per bill, list of bills where the two methods disagree by > $0.01, and any bills present in the bills list but missing from `openBySource`.
- Always show the existing reconciliation banner whenever `|glNet − grandTotal| > 0.01` (currently only shown in `__total__` view) so the diff is visible in any lot view too.

**Pass 2 — fix the actual root cause (data-driven from Pass 1 logs):**
- Resolve the A/P account by `code='2010' AND owner_id = <bill owner>` derived from the first bill, instead of `maybeSingle()` over a global lookup. Fall back to summing all 2010-coded accounts the user can see if the project's owner can't be determined.
- For any bill that exists in the bills list but has no entry in `openBySource`, fall back to its `total_amount − amount_paid` so legacy bills without journal entries are not silently zeroed.
- For any bill where `openGL` and `total − amount_paid` disagree, prefer `openGL` (the GL is truth) but include the bill regardless of whether either source is non-zero, and let the $0.01 filter act on the GL-derived value only.
- Replace the `asOfDate.toISOString().split('T')[0]` calls with a local-time `format(asOfDate, 'yyyy-MM-dd')` to eliminate the UTC drift (Balance Sheet should get the same change in a follow-up if needed; outside this scope).

### Verification
On project `494d10f1-…` as of 02/28/2026 the A/P Aging Total Outstanding shows **$161,894.60**, identical to the Balance Sheet 2010 A/P balance. The reconciliation banner is empty. Pass 1 console diagnostics, kept behind a `console.debug`, list zero discrepancies. Spot-check on three other dates and a different project (1907 Homes).

### Files touched
- `src/components/reports/AccountsPayableContent.tsx` only.

