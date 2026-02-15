

## Update Chart of Accounts Template and Derrick Russell Homes Data

### Overview

Two changes: (1) Replace the edge function to use a hardcoded template instead of copying from Old Creek Homes, and (2) update Derrick Russell Homes' existing accounts in the database to match.

### Final Template (15 accounts)

| Code | Name | Type | Description |
|------|------|------|-------------|
| 1010 | XYZ Bank | asset | — |
| 1020 | Deposits | asset | — |
| 1060 | Loan to XYZ | asset | — |
| 1320 | Land - Held For Development | asset | — |
| 1430 | WIP - Direct Construction Costs | asset | — |
| 1670 | Deposits | asset | — |
| 2010 | Accounts Payable | liability | Outstanding amounts owed to vendors and suppliers |
| 2150 | XYZ Credit Card | liability | — |
| 2530 | Loan - Land | liability | — |
| 2540 | Loan Refinance | liability | — |
| 2905 | Equity | equity | — |
| 3120 | Construction Management Fees | revenue | — |
| 32000 | Retained Earnings | equity | Undistributed earnings of the business |
| 9150 | Ask Owner | asset | — |

Deleted from original: 1030 (Clearing), 1040 (Loan to OCH at N. Potomac), 1050 (Loan to OCH at Lexington), 5000 (Office Expenses), 50000 (Cost of Goods Sold), 5100 (Professional Services)

### Changes

**1. Rewrite `copy-template-accounts` edge function**

Replace the database-fetch approach with a hardcoded array of 14 template accounts. No more dependency on Old Creek Homes data. The function will still handle authentication, check for existing accounts, and insert with new UUIDs.

**2. Update Derrick Russell Homes accounts in the database**

Run SQL to:
- Rename 1010 to "XYZ Bank"
- Rename 1060 to "Loan to XYZ"
- Rename 1670 to "Deposits"
- Rename 2150 to "XYZ Credit Card"
- Rename 2540 to "Loan Refinance"
- Delete 1030, 1040, 1050, 5000, 50000, 5100

**3. Update Old Creek Homes template accounts similarly**

So the source data also reflects the generic template (in case anything else references it).

### Files to modify

| File | Change |
|------|--------|
| `supabase/functions/copy-template-accounts/index.ts` | Rewrite to use hardcoded template array instead of fetching from Old Creek Homes |

### Database updates (run via SQL)

Renames and deletes for both Derrick Russell Homes and Old Creek Homes accounts to align with the new generic template.

