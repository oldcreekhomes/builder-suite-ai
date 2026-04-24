## Unify Edit Bill dialogs into one component

**Goal:** Single `EditBillDialog` used by Review, Approved, Paid, Account Register, and Job Cost drilldown. Base it on the current `EditExtractedBillDialog` (which has all of today's fixes: descriptions, spinners, natural lot sort, etc.). Header becomes simply **"Edit Bill"**.

### Steps

1. **Promote source of truth**
   - Rename `src/components/bills/EditExtractedBillDialog.tsx` → `src/components/bills/EditBillDialog.tsx`.
   - Change header title to "Edit Bill".
   - Extend props: accept either `pendingUploadId` (pending/review mode) or `billId` (posted mode).

2. **Port posted-bill save logic** from legacy `EditBillDialog.tsx`:
   - Journal entry regeneration on save for posted bills.
   - Approved/Paid guardrails (preserve A/P balances, reference-number per-vendor uniqueness, zero-amount line guard).
   - Re-fetch & cache invalidation for bills, A/P, journal entries, and job costs.

3. **Repoint all call sites** to the unified dialog:
   - `src/components/bills/BillsReviewTableRow.tsx`
   - `src/components/bills/BatchBillReviewTable.tsx`
   - `src/components/bills/BillsApprovalTable.tsx`
   - `src/components/bills/PayBillsTable.tsx`
   - `src/components/accounting/AccountDetailDialog.tsx`
   - `src/components/reports/JobCostActualDialog.tsx`
   (Exact paths verified during implementation.)

4. **Delete** the legacy `src/components/bills/EditBillDialog.tsx` after the rename — handled by writing the new file at the same path so there is only one `EditBillDialog`.

### Will NOT touch
- Descriptions / memo logic
- Quantity / Unit Cost spinner styling
- Address tooltip lot sorting
- Grouping, PO matching, totals, or any calculations
- Any unrelated dialogs or pages

### Risk / preservation notes
- Posted bills (Approved/Paid) must continue to regenerate journal entries on save and respect period-close rules.
- Pending bills (Review) continue to use existing `usePendingBills` flow.
- Per-vendor invoice uniqueness check stays intact.
