

## Fix A/P Aging report to match Balance Sheet ($161,894.60)

### Diagnosis
On project `494d10f1-…` as of 02/28/2026:

| Source | Total | Method |
|---|---|---|
| Balance Sheet → 2010 A/P | **$161,894.60** | Sum of all journal entry lines posted to account 2010 (debits − credits, as-of date) |
| Balance Sheet → click 2010 (QB-style detail) | **$161,894.60** | Same, shown line-by-line |
| A/P Aging report (current) | $153,395.89 | Per-bill: `total_amount − amount_paid_as_of` (broken) |

Discrepancy = **$8,498.71 short** in the A/P Aging report. The Balance Sheet is the source of truth (direct from the general ledger).

Three confirmed bugs in `src/components/reports/AccountsPayableContent.tsx`:

1. **Credit-memo math is wrong** (≈ $500 off)  
   Bill `OCH-02302` is a vendor credit with `total_amount = −$500` and a $500 internal application payment. Current code does `−500 − 500 = −$1,000`, then the UI further mis-renders it as `−$500`. Either way the credit memo's "open balance" should simply track its remaining unapplied portion of the −$500, not be reduced by application debits that are themselves part of the credit's accounting.

2. **Bill-row payload truncation / 1000-row PostgREST cap** (≈ $7,498.71 off)  
   The bills query embeds `bill_lines(lot_id, amount)` and `bill_attachments(...)`. With ~149 active bills × multiple lines × multiple attachments, the response can be silently truncated by PostgREST's default 1000-row limit, dropping the tail of the bill list (the most recent 1-30-day bills) entirely. This explains why the 1-30 bucket totals $153,973 instead of $160,972.

3. **No reconciliation guard against the GL.**  
   The report computes from the bills table but never sanity-checks against the GL credits/debits to account 2010. Discrepancies pass silently.

### What changes (one file)
`src/components/reports/AccountsPayableContent.tsx`

**A. Replace the bill-list query with paginated, slim fetch + separate child fetches.**
- Page through `bills` with `fetchAllRows` (already used in `BalanceSheetContent`) selecting only the parent columns (no embedded `bill_lines` / `bill_attachments`).
- Fetch `bill_lines (id, bill_id, lot_id, amount)` and `bill_attachments(...)` in separate paginated calls keyed by `bill_id IN (batchedIn(activeBillIds, 200))` per the project's `Supabase batching` memory.
- Stitch them back into the bill objects in memory. This eliminates the 1000-row embedded-cap truncation.

**B. Switch the open-balance source of truth to the GL for the aging total.**
- Compute each bill's open balance as: `creditsToAP(billId) − debitsToAP(billId)` from `journal_entry_lines` joined to `journal_entries` where `account.code = '2010'`, scoped to `source_id = bill.id` regardless of `source_type`. This matches the Balance Sheet exactly and naturally handles credit memos, partial payments, and any future adjustment types.
- Use the same as-of/reversal filters already used in `BalanceSheetContent` (`is_reversal=false`, `reversed_by_id IS NULL`, `entry_date <= asOf`, `reversed_at IS NULL OR > asOf`) so the two reports can never disagree.
- Drop the bespoke `paidAsOfDate` / `predecessorToActive` map — no longer needed.

**C. Bucket on `aging` from the bill date as today, but include `aging = 0` rows correctly.**
- Keep the existing 1-30 / 31-60 / 61-90 / >90 buckets. Bills with `aging < 0` (future-dated relative to as-of) cannot exist because of the `bill_date <= asOf` filter.
- Negative open balances (credit memos) stay grouped by their bill's aging bucket and reduce that bucket's subtotal — so the report ties to the GL line-for-line.

**D. Add a reconciliation safeguard.**
- After computing the per-bill open balances, also compute the GL net for account 2010 (project-scoped, same date filters) and compare to `grandTotal`. If they differ by more than $0.01, render a small warning row under the grand total: `"Reconciliation difference vs G/L: $X.XX — please contact support"`. This makes any future regression visible immediately.

**E. Lot view stays correct.**
- For a specific lot, allocate each bill's GL-derived open balance proportionally by `lot_amount / total_amount` from `bill_lines` (same ratio currently used). Unchanged shape; only the input source changes from `total_amount − paid` to GL-derived open.

### Out of scope
- No DB schema changes.
- Balance Sheet, Income Statement, Job Costs, Manage Bills, and PDF export shape are unchanged. Only the data feeding `AccountsPayableContent` (and its PDF) changes.

### Verification
On project `494d10f1-…` as of 02/28/2026 the A/P Aging Total Outstanding shows **$161,894.60**, identical to the Balance Sheet 2010 A/P balance and to the QB-style detail click-through. Spot-check the same on three other dates and on a different project.

### Files touched
- `src/components/reports/AccountsPayableContent.tsx` only.

