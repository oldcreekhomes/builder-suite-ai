## Findings

- January and February are both off by **$0.13** because the Oxford project has **13 unbalanced journal entries** where total debits and credits differ by pennies.
- Those entry-level differences add up to exactly the Balance Sheet difference shown in the screenshots.
- The recurring cause is journal creation code that sometimes uses a header total on one side and line totals on the other side, especially in corrected bills and deposits.

## Plan

1. **Repair the existing Oxford data**
   - Add a one-time SQL data migration that finds penny-level unbalanced journal entries for the Oxford project.
   - For bill entries, adjust the A/P line by the exact residual penny amount.
   - For the one deposit entry, adjust the bank line by the exact residual penny amount.
   - Only repair small rounding residuals under $1.00; do not touch large mismatches.

2. **Fix bill journal creation going forward**
   - Patch `useBills.ts` corrected-bill logic so the A/P line is calculated from the rounded sum of the actual journal lines, not from `correctedBill.total_amount`.
   - Keep the existing posted-bill path that already uses actual line totals.

3. **Fix deposit journal creation going forward**
   - Patch `useDeposits.ts` create/update logic so the bank line is calculated from the rounded sum of the deposit source lines.
   - Tighten validation to cent-precise equality so a $0.01 header-vs-lines difference cannot create an unbalanced entry.

4. **Verify the Balance Sheet**
   - Re-query Oxford as of **January 31, 2026** and **February 28, 2026**.
   - Confirm Assets equal Liabilities & Equity to the cent for both months.
   - Confirm the remaining unbalanced-entry query returns zero rows for Oxford through February.