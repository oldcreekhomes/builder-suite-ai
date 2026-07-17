## Problem
On the Paid tab, single-bill payments render via `renderBillRow` (line 946), which never got the two new `Paid On` / `Paid By` cells — only the multi-item payment header rows do. Because these standard rows are missing the two `<TableCell>`s, every column after Reference shifts left and the Paid On / Paid By headers show empty space.

## Fix
Single file: `src/components/bills/BillsApprovalTable.tsx`.

1. In `renderBillRow`, right after the Reference `<TableCell>` (line 1133), when `isPaidStatus`, insert:
   - `Paid On` cell — look up the bill's payment in `paymentGroupsMap` (find the group whose `billIds` contains `bill.id`) and render `formatDisplayFromAny(group.paymentDate)`; fallback `—`.
   - `Paid By` cell — same lookup, render the initials avatar (`h-7 w-7 rounded-full bg-muted text-xs font-medium`) with tooltip full name, matching the multi-header row style; fallback `—`.

2. Do the lookup by iterating `paymentGroupsMap` (already in scope via the hook) into a memoized `billToPaymentGroup` map at render time, so each row is O(1).

No changes to header, colspan, other tabs, or business logic. Multi-item payment header + child rows already render the two cells correctly.
