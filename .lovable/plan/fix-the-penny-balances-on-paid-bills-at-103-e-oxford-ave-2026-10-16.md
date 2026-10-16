# Fix the penny balances on paid bills at 103 E Oxford Ave

## What's wrong
23 bills at Oxford are marked **Paid** but still show $0.01–$0.02 open. These are bills that were split across lots: the per-lot shares were rounded up, so the bill total ended up a penny or two above the real invoice (for example Rimble 154810: paid $146.25, bill recorded $146.27). The payment was correct; the bill was inflated. That leftover sits in Accounts Payable (2010), so A/P Aging and the Balance Sheet don't tie out. Total leftover is about $0.26.

## The fix (data only, Oxford only)
For each of the 23 bills:
1. Trim the overage from the largest lot line so the lines add up to the amount actually paid.
2. Set the bill total to the paid amount.
3. Reduce the matching cost line and the A/P credit in that bill's journal entry by the same pennies, so the entry stays balanced.

Closed months stay locked to users; only these penny corrections are made.

## Result
All 23 bills show $0.00 open and drop off A/P Aging, A/P 2010 on the Balance Sheet matches the Aging total, and job costs drop by the same few cents.

## Follow-up (separate, if you want it)
Find where lot splits round up when a bill is entered and switch it to the remainder method, so this stops happening on new bills.
