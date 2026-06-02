## Problem

On the **Paid** tab of Manage Bills, the footer shows `Total amount: $0.01` for 19 bills. This is because the footer formula sums each bill's **open balance** (`total_amount − amount_paid`). On the Paid tab every bill is fully paid, so each open balance is ~0 and the total collapses to a rounding cent.

Other tabs (Review, Rejected, Approved) work correctly because those bills are unpaid, so open balance == total amount.

## Fix

In `src/components/bills/BillsApprovalTable.tsx` (lines 1937–1948), change the footer total calculation so that on the Paid tab it sums `bill.total_amount` directly (matching the Amount column shown on that tab). On all other tabs keep the current open-balance behavior.

Concretely: detect Paid status using the existing `isPaidStatus` flag already defined at line 411, and branch:
- Paid tab → `sum += Math.round(bill.total_amount * 100) / 100`
- Other tabs → existing open-balance formula

No other changes — purely a presentation fix in the footer.
