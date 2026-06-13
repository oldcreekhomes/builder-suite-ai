I found **4 financial transaction/detail dialogs** in the accounting reports area that can display a transaction Type:

1. `AccountDetailDialog` — used by Balance Sheet and Income Statement account drilldowns, including the Equity dialog in your screenshot.
2. `JobCostActualDialog` — used by Job Cost actual cost drilldowns.
3. `TransactionDetailDialog` — nested transaction detail dialog opened from account/job-cost rows.
4. `ReconciliationReviewDialog` — bank reconciliation review dialog with debit/credit transaction Type columns.

Plan:
- Create one shared transaction type-label helper so `manual` / `journal_entry` always displays as **JE** everywhere a transaction Type is rendered.
- Replace the remaining local type-label logic in all 4 financial dialogs with that shared helper.
- Keep full wording like **Journal Entry #**, **Delete Journal Entry**, and the Journal Entry tab/page unchanged because those are entity/page labels, not Type column values.
- Re-scan the accounting/report/transaction dialogs after the change to confirm no financial Type display still says **Journal Entry**.