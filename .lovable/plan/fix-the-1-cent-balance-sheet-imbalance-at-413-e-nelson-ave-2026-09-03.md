# Fix the 1-cent balance sheet imbalance at 413 E Nelson Ave

## What's actually wrong

Assets are $1,427,916.31 and Liabilities & Equity are $1,427,916.32 — one penny apart.

Verified in the data: a single deposit dated 03/11/2026 ("Jole Ann Cortes", memo "1099 Tax Filing Fees") for $5.45 was split across two lots at **$2.725 each**. Half a cent is not a real amount. When that deposit posted to the general ledger, each half rounded up to $2.73, so the journal entry debits $5.45 but credits $5.46. That single entry is the only unbalanced entry on the project and it accounts for the exact one-cent gap.

## What will be done

1. **Correct the deposit split** to $2.73 and $2.72 (total $5.45) on the two deposit lines, and set the matching journal entry line for the second lot to $2.72 so the entry debits and credits $5.45 evenly.
2. **Stop sub-cent line amounts from being saved** in the deposit screens. Line amounts (quantity x unit amount) will be rounded to whole cents when the deposit is saved, with any leftover cent applied to the last line so the lines always add up exactly to the deposit total. This is the same rounding rule already used elsewhere in the app for splits.
3. **Verify** 413 E Nelson shows Total Assets = Total Liabilities & Equity = $1,427,916.31, and that no other journal entry on the project is unbalanced.

Only this deposit's amounts change. No other project, bill, payment, or reconciliation is touched.

## Technical details

- Data fix: update `deposit_lines.amount` (2.725 -> 2.73 / 2.72) for deposit `2b1520ed...` and the corresponding `journal_entry_lines.credit` on entry `2f0756bf...`.
- Code fix: in `src/components/deposits/EditDepositDialog.tsx` and `src/components/transactions/MakeDepositsContent.tsx`, round each computed line amount to cents (integer-cent math) before building the payload and push the rounding remainder onto the final line. The existing header-vs-lines cent validation in `src/hooks/useDeposits.ts` stays as the safety net.
- Verification query: re-run the per-account balance rollup for the project as of the report date and the unbalanced-entry check.
