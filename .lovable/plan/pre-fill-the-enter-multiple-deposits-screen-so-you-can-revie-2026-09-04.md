# Pre-fill the Enter Multiple Deposits screen so you can review it live

Nothing was saved to the database — the earlier insert was stopped, and I confirmed no deposits exist. So this is purely about filling the on-screen form.

## What you'll see
When you open Enter Multiple Deposits, the five rows will already be filled in:

| Project | Date | Deposit To | Received From | Description | Amount |
|---|---|---|---|---|---|
| 100 Nob Hill Ct (Nob Hill/Westridge) | 09/04/2026 | 1015 Capital One | Old Creek Homes, LLC | Equity | 62,000.00 |
| 126 Longview Drive (Longview SFD) | 09/04/2026 | 1015 Capital One | Old Creek Homes, LLC | Equity | 1,000.00 |
| 115 E. Oceanwatch Ct. (Oceanwatch) | 09/04/2026 | 1015 Capital One | Old Creek Homes, LLC | Equity | 16,000.00 |
| 1 East Custis Avenue (Custis) | 09/04/2026 | 1015 Capital One | Old Creek Homes, LLC | Equity | 15,000.00 |
| 923 17th St. South (17th St) | 09/04/2026 | 1015 Capital One | Old Creek Homes, LLC | Equity | 15,000.00 |

Total: **$109,000.00**

The Account column is left blank on every row — you pick the equity account yourself, then hit Save Batch. Nothing posts until you click Save.

## Technical details
- One temporary change in `src/components/multi-entry/MultiDepositTable.tsx`: seed the initial `rows` state with the five entries above instead of five blank rows (project id, bank account `7b456e28…` labeled "1015 - Capital One", company `4e36c64e…` "Old Creek Homes, LLC", memo "Equity", amount).
- Seed applies only on first mount; Clear and Add Row still produce blank rows.
- No database writes, no changes to the save hook or accounting logic.
- Once you've saved the batch, tell me and I'll remove the seed so the page opens blank again.
