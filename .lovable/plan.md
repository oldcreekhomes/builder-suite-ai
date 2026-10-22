# Fix the $0.03 A/P gap at Oceanwatch

## What's wrong (confirmed)
On the Balance Sheet, A/P at Oceanwatch as of 5/31/2026 is $48,679.24. The A/P report is $0.03 lower because three bills marked **Paid** still have $0.01 each on A/P:

| Bill | Vendor | Bill total | Paid | Left on A/P |
|---|---|---|---|---|
| 111-0666091-8709853 | Amazon | $1,300.70 | $1,300.69 | $0.01 |
| 112-8095482-9208204 | Amazon | $216.38 | $216.37 | $0.01 |
| 2007975523-001 | ABC Building Supply | $246.38 | $246.37 | $0.01 |

This is the same issue as the Oxford bills. When each bill was split across 2 lots, both halves were rounded up, so each bill came out $0.01 more than the invoice. The payments are correct.

The A/P report hides any balance of $0.01 or less. That's why you see the red difference message but no bill to explain it. The same $0.03 is still there today, so every month from May on shows it.

## Fix
1. **Data (these 3 bills only):** take the extra $0.01 off one lot line on each bill, so the bill total equals the amount paid. Take the same $0.01 off the cost line and the A/P line in each bill's accounting entry, so the entry stays balanced. Closed months stay closed to users.
2. **A/P report:** show any open balance of $0.01 or more, so a leftover penny shows up as a bill instead of a mystery difference.
3. **Stop it from happening again:** when a bill is split across lots, round the shares so they add up exactly to the bill total, with the last lot taking the remainder. This applies to Enter Bills, Enter with AI and Edit Bill.

## Result
As of 5/31, A/P on the report and on the Balance Sheet are both $48,679.24, and the red message is gone. The three bills show $0.00 open. Job costs at Oceanwatch drop by $0.03.

## Technical details
- Bills: `776fa8ff-e6b9-4f50-a2aa-b028b90df73f`, `3fbbfa6b-55e4-4a8b-803e-1cd0594f60c4`, `9bddac7c-139b-4020-9c61-538d9a00774f`. Each one: reduce the largest `bill_lines.amount` by 0.01, set `total_amount` = `amount_paid`, and reduce the matching debit line and the 2010 credit by 0.01 on its `source_type='bill'` JE.
- `src/components/reports/AccountsPayableContent.tsx` ~line 298: change the filter `Math.abs(open) > 0.01` to `>= 0.005`. Mirror the change in the PDF.
- Find the lot-split helper used by bill entry and switch it to remainder math (`roundCents` per share, last lot = total − sum). Add a bun test: $216.38 over 2 lots gives $108.19 + $108.19 = $216.38, and $100.00 over 3 lots gives $33.33 + $33.33 + $33.34.
- Run the same penny check on every project and list any other bills like these.
