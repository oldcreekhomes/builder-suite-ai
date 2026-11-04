# Fix Credit Card entries so they post to the job like a Deposit

## What actually happened
- Your Stitch Fix purchase ($174.89, 11/04/2026, US Bank - 7423, 8270 Office Supplies) **did save — once**. There is only one copy, no duplicate.
- The expense side was tagged to 228 S Washington, so it hit the job's P&L (that's the -$174.89 Current Year Earnings).
- The credit card side (2150.05 US Bank - 7423) was saved with **no job attached**, so the job's Balance Sheet never shows the $174.89 owed on the card. That's why the Balance Sheet is out of balance by $174.89.
- The entry itself was also saved with no job, so it doesn't show as belonging to 228 S Washington.
- Deposits put the job on every line, including the bank side. Credit cards skipped it. This is the only credit card entry in the whole system, so nothing else is affected.

## Fix (same way Deposits work)
1. **Save the job on the entry**: when you're inside a job, the credit card entry is saved to that job (it was only using a job picker that isn't on screen).
2. **Put the job on the credit card side of the books**: purchases credit the card account for that job; refunds debit it for that job. Edits already did this; new saves didn't.
3. **Job-only list**: Search and the back/forward arrows on Credit Cards only show that job's entries, like Deposits.
4. **Cent-exact totals** and the date saved exactly as picked (no flipping to the next day for evening saves).

## One-time data fix
- Attach the Stitch Fix entry and its 2150.05 line to 228 S Washington. Amount, accounts and date stay the same.
- Result: 228 S Washington Balance Sheet shows 2150.05 US Bank - 7423 = $174.89, Total Liabilities $174.89, and Liabilities & Equity = $0.00, matching Total Assets.

## Check
- Re-read the Balance Sheet numbers for 228 S Washington after the fix.
- Add a small test that a credit card purchase and refund always carry the job on the card line and balance to the cent.

## Technical details
- `src/components/transactions/CreditCardsContent.tsx`: header `project_id: selectedProjectId || projectId`; date via `format(transactionDate,'yyyy-MM-dd')`; pass projectId to the hook for list filtering.
- `src/hooks/useCreditCards.ts`: liability line gets `project_id: data.project_id ?? null` in create (purchase + refund) and correction reversal keeps `project_id`; query filtered by `project_id` when provided (key `['credit-cards', projectId]`); cent math for total.
- Extract journal-line building into `src/lib/creditCardJournalLines.ts` with `creditCardJournalLines.test.ts`.
- Data: update `credit_cards` 7025ad28… `project_id` and its 2150.05 `journal_entry_lines` row `project_id` to `dfad3ec5-8955-4377-9c73-6c465f9941f8`.
- Add AGENTS.md rule: credit card liability lines carry the entry's project_id, like deposit bank lines, so project balance sheets balance.
