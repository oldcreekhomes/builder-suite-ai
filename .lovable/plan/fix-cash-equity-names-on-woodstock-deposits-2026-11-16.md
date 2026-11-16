# Fix "Cash" / "Equity" names on Woodstock deposits

## What happened
Yes — the $7,000 Woodstock deposit on 10/01/2026 was entered through **Multiple Deposits** (a bulk batch). That screen saved it without a "Received From" company, so the report falls back to "Cash". 9 deposits across all jobs have no company saved.

The 09/10 ($1,000) and 09/24 ($6,000) deposits show "Equity" for a different reason: they do have Old Creek Homes, LLC saved, but the report shows the description ("Equity") in the Name column before the company name.

## Fix
1. **Data:** set the 10/01/2026 $7,000 Woodstock deposit to Old Creek Homes, LLC. Amount, account, cleared status unchanged.
2. **Multiple Deposits:** make sure the "Received From" pick is saved on every deposit in the batch, and block saving a row with no Received From.
3. **Report Name column:** show the company name first; only fall back to the description, then "Cash", when no company exists. Same in Deposit Search.
4. List the other 8 deposits with no company so you can tell me who they're from.

## Technical
- `UPDATE deposits SET company_id='4e36c64e-…', company_name='Old Creek Homes, LLC' WHERE id='a86f4a99-…'`.
- Inspect `MultiDepositTable.tsx` save payload for `company_id`/`company_name`.
- `AccountDetailDialog.tsx:310` reorder to `companies?.company_name || company_name || memo || 'Cash'`.
