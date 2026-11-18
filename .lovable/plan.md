# Custis double payment - simple explanation

## What's wrong
- Job: 1 E Custis
- Bill: 06082026-Custis for $4,604.17
- The bill was paid **twice** on 06/09/2026 from 1015 Capital One.
  - Payment 1: $4,604.17, **cleared** in the June 2026 bank reconciliation (this is the real one).
  - Payment 2: $4,604.17, **never cleared** (the bank never took this money).
- Result: the books show $9,208.34 paid, but the bank only paid $4,604.17.
- So the 1015 Capital One balance in the app is **$4,604.17 too low**.

## How to double check
1. Open 1 E Custis > Reports > Balance Sheet > 1015 Capital One.
2. Search "4604" or "06082026-Custis".
3. You should see two rows on 06/09/2026 for $4,604.17: one Cleared, one not.
4. Check your real Capital One statement: only one $4,604.17 charge should be there.

## Fix (only after you say go)
1. Re-check both payments still look this way before touching anything.
2. Undo only the **uncleared** payment (Payment 2).
3. Leave the cleared payment and the June reconciliation alone.
4. Bill stays Paid at $4,604.17.
5. 1015 Capital One goes up by $4,604.17.
