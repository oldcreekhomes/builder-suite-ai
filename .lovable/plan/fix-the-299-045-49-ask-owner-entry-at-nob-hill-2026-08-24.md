# Fix the $299,045.49 "Ask Owner" entry at Nob Hill

## What's there now

A single Deposit dated 07/14/2026 for $299,045.49 (created 08/20 by Jole Ann Sorensen, memo "Erica Gray") into **1015 - Capital One**. Its offset was split into 19 lot lines against **9150 - Ask Owner** ($15,739.23 x 18 + $15,739.35) — that's why the Ask Owner register shows the same amount repeating 19 times. It has one linked journal entry ("Deposit to Your Bank Name", 20 lines).

## What I'll do (data fix only, no code changes)

1. Delete the deposit, its 19 deposit lines, and its journal entry/lines.
2. Create one manual Journal Entry dated **07/14/2026**, description "Equity contribution - Partner #2":

```text
Debit   1015 Capital One                          299,045.49
Debit   1430 WIP / cost code 2440 Land Carrying Costs
        split across all 19 lots, memo "wire fees"    954.51
Credit  2905.2 Equity Partner #2                  300,000.00
```

Lot split of the $954.51: $50.24 on 18 lots, $50.19 on the last lot (cent-precise, sums exactly).

## Assumptions (tell me if any are wrong)

- Cash account is the same **1015 - Capital One** the original deposit used.
- Entry date stays **07/14/2026**.
- Land Carrying Costs is posted as a job cost (WIP 1430 with cost code 2440), consistent with every other job cost in this project.

## Verification

After the change I'll re-query: 9150 Ask Owner has no remaining lines from this entry, 2905.2 equals $300,000 for the contribution, Capital One is up $299,045.49, and the JE debits equal credits.
