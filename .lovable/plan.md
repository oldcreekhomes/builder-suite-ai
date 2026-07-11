## Fix empty Description / Cost Code columns in Reconciliation Review

Confirmed by querying the DB for the March 2026 reconciliation on 923 17th:

- `bill_lines.memo` holds the real work description (e.g., "January and February gas", "2/13 - 30 Yard Delivery", "Rough-in").
- `bill_lines.cost_code_id` is populated, joining cleanly to `cost_codes` (e.g., `4045 - Gas`).
- `bill.notes` is a **comment/audit log** ("Jole Ann Sorensen | 03/12/2026: Paid"), not a description — it should not be shown as Description.
- `check.memo` is `NULL` on the sampled checks; the real description is on `check_lines.memo`.

The current dialog shows "-" for every row because the previous change prefers `bill.notes` / `check.memo` (mostly empty or garbage) and, on this browser session, the React Query cache is still returning the pre-change response for this reconciliation.

### Change (single file: `src/components/transactions/ReconciliationReviewDialog.tsx`)

1. **Description precedence flip:**
   - Checks: `check_lines[0].memo` → then `check.memo` → else `-`.
   - Bill payments (both JE-line and legacy paths): `bill_lines[0].memo` → then `bill.notes` → else `-`. If the bill has multiple lines with different memos, join first two with `; ` and add `…` when more exist.
   - Deposits: `deposit_lines[0].memo` → then `deposit.memo` → else `-`.
   - Manual JE lines: unchanged (`line.memo`).

2. **Cost Code:** already fetched — keep the aggregation (`"code - name"`, `Multiple` when >2 distinct). No source change.

3. **Bust the cached query** so users don't need a hard refresh: bump the queryKey to `['reconciliation-transactions-by-id', 'v2', reconciliationId]`.

No schema, no DB, no other files.
