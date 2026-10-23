# Two fixes at Oceanwatch

## 1. Approved says (2) but shows 1 bill (confirmed)
The second bill is Carter Lumber 53500053280 ($7,007.20). It was reversed, so it was taken off the books. But it was never moved out of Approved. The Approved list hides reversed bills, so you don't see it. The Approved (2) count still counts it.

**Fix:**
- Change the tab counts to skip reversed bills, the same way the list does. Approved will show (1). This applies to every job.
- Check the other tab counts (Review, Rejected, Paid, Archived) for the same mismatch.

No money or reports change. The reversed bill is already off A/P and the Balance Sheet.

## 2. $0.03 A/P gap as of 5/31 (confirmed)
Three bills marked Paid still have $0.01 each on A/P: Amazon 111-0666091-8709853, Amazon 112-8095482-9208204, and ABC Building Supply 2007975523-001. When each bill was split across 2 lots, both halves were rounded up. The A/P report hides balances of $0.01 or less, which is why you get the red message but no bill to explain it.

**Fix:**
- Take the extra $0.01 off each bill and its accounting entry. Each entry stays balanced, closed months stay closed, and Oceanwatch job costs drop by $0.03.
- Make the A/P report show any balance of $0.01 or more, so a leftover penny shows as a bill.
- Make lot splits always add up exactly to the bill total, with the last lot taking the remainder.

**Result:** as of 5/31, the A/P report and the Balance Sheet both show $48,679.24, and the red message is gone.

## Technical details
- `src/hooks/useBillCounts.ts` (around lines 40-47): add `.is('reversed_by_id', null)` so the counts match the `BillsApprovalTable` filters, then audit the other count queries.
- Penny bills: `776fa8ff…`, `3fbbfa6b…`, `9bddac7c…`. Reduce the largest `bill_lines.amount` by 0.01, set `total_amount` to `amount_paid`, and reduce the matching debit and the 2010 credit on each `source_type='bill'` entry by 0.01.
- `AccountsPayableContent.tsx` ~line 298, and the PDF: change the filter to `>= 0.005`.
- Lot split helper: switch to remainder math, with a bun test ($216.38 over 2 lots gives 108.19 + 108.19; $100 over 3 lots gives 33.33 + 33.33 + 33.34).
