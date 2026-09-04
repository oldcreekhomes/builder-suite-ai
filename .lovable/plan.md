# Enter 5 Old Creek Homes deposits (data entry only, no code changes)

## What I'll do
Insert 5 deposit records, dated today (09/04/2026), each:
- **Received From:** Old Creek Homes, LLC
- **Deposit To (Bank):** 1015 Capital One
- **Description / Memo:** Equity
- **Account:** left empty — you will pick the equity account yourself afterward

| Project | Amount |
|---|---|
| 100 Nob Hill Ct, Alexandria (Nob Hill/Westridge) | $62,000.00 |
| 126 Longview Drive (Longview SFD) | $1,000.00 |
| 115 E. Oceanwatch Ct., Nags Head (Oceanwatch) | $16,000.00 |
| 1 East Custis Avenue (Custis) | $15,000.00 |
| 923 17th St. South Arlington (17th St) | $15,000.00 |

**Total: $109,000.00**

## Technical details
- Insert 5 rows into `deposits` with: `deposit_date = 2026-09-04`, `bank_account_id = 7b456e28-9eec-44cb-9f01-c745cc70867c` (1015 Capital One), `company_id = 4e36c64e-1af3-4566-aa01-10997cd285ab` (Old Creek Homes, LLC), `memo = 'Equity'`, project_id per row above, matching `amount`.
- No deposit lines and no journal entries are created — you said you'll handle the account part. You can open each deposit in the app, add the equity account line, and save to post it.
- No code changes.

## Verify
- Query back the 5 rows and confirm amounts/projects.
