# Fix "1020 - Deposits" Showing a Star

## Root cause
The original backfill that set `accounts.subtype` tagged every asset account with code 1000-1039 as `subtype = 'bank'`. That caught `1020 - Deposits`, which is a holding/clearing account, not a real bank account. The star UI is working correctly — it shows for every account whose subtype is `'bank'`. Same logic powers the bank dropdowns in Write Checks, Make Deposits, Pay Bill, and Reconcile, so right now "Deposits" would also appear as a selectable bank in those dropdowns. Both problems disappear once 1020's subtype is corrected.

## Fix

**Data correction (one row):** set `accounts.subtype = 'other'` (or `NULL`) for the row `code = '1020', name = 'Deposits'` belonging to this tenant.

After that:
- The star next to 1020 disappears in Edit Project → Chart of Accounts.
- 1020 stops appearing in the bank-account dropdown in Make Deposits, Write Checks, Pay Bill, and Reconcile.
- `1010 - Atlantic Union Bank` and `1015 - Capital One` remain the only banks, exactly as you want. Capital One stays the company-wide default (star) until you change it.

## How you want me to apply it

Pick one — I'll wait for your call before touching anything:

1. **Quick data update (recommended).** I run a one-line update on just `1020 - Deposits` for your tenant, flipping its subtype to `other`. Done in seconds. You can change other misclassified accounts later via the Edit Account dialog (the subtype field already exists there).

2. **You do it manually.** Go to Settings → Chart of Accounts, click Edit on `1020 - Deposits`, change Subtype from "Bank" to "Other", save. Same end result, no migration needed.

3. **Broader sweep.** I scan all asset accounts in your tenant currently marked `subtype = 'bank'`, list them for you, and you tell me which should be reclassified. Useful if other 10xx codes are also miscategorized (e.g. `1670 - Deposits` may have the same issue if it's tagged bank — it's outside the 1000-1039 range but worth checking).

No code changes are needed — only data. The star UI and the dropdown filters are behaving correctly given the underlying classification.
