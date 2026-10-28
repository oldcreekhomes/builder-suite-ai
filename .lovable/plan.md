# Fix the $0.01 City of Alexandria bill at 412 E Nelson, then sweep every job

## What's wrong
Bill INV-2026-00000995 (City of Alexandria, 01/22/2026) was paid $2,001.95 on 02/11/2026, but the bill adds up to $2,001.96. The $1.95 fee was split across the 2 lots as $0.98 + $0.98 (both rounded up), the same penny problem we fixed at Oceanwatch. The bill was entered before the split fix, which only stops new bills.

## Step 1 – Fix this bill (data only)
- Change one $0.98 lot line to $0.97, so the bill totals $2,001.95, the amount paid.
- Lower the matching job cost line and A/P line in its accounting entry by $0.01, so the entry still balances.
- Read it back: the bill should show $0.00 open, and A/P at 412 E Nelson goes down $0.01. Job costs for that lot go down $0.01.
- Closed months stay closed. Payments and reconciliations aren't touched.

## Step 2 – Find every other leftover penny on all jobs
- List every Paid bill on every job where the bill total and the amount paid differ by $0.01 to $0.05.
- Fix each one the same way (take the extra penny off the last lot's line and its entry).
- Report the list back: job, vendor, bill number, amount.

## Not changing
- No code changes. New bills already split correctly.
- The A/P report is right to show the $0.01. It goes away once the bill is fixed.
