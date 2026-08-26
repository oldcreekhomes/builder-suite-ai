# Project-aware bank accounts in Pay Bill (and every other picker)

## What's actually happening

Checked the data for 2401 N Potomac:

- The project default bank **is** already set to account 1010 — that's the account the Pay Bill dialog preselected. It just displayed the tenant-wide name "Atlantic Union Bank" instead of this project's renamed label "John Marshall", so it looked like the default was wrong.
- 1015 Capital One and 2150 XYZ Credit Card **are** excluded from this project's Chart of Accounts, but the Pay Bill dropdown lists every bank/credit-card account in the tenant, ignoring project exclusions.

The account search fields used in Write Checks, Deposits, Credit Cards already apply both project renames and project exclusions. The Pay Bill dialog (and a couple of other plain dropdowns) do not.

## Changes

1. Add a shared hook that, given a project, returns the payment accounts to offer:
   - bank accounts (and credit-card accounts where applicable),
   - with accounts excluded from that project's Chart of Accounts removed,
   - labeled with the project's account-name override when one exists.
2. Use it in the Pay Bill dialog so:
   - the dropdown shows only accounts enabled for the project (no Capital One, no XYZ Credit Card at N Potomac),
   - the selected/preselected default renders as "1010 - John Marshall",
   - if the stored project default is itself excluded, fall back to the first allowed bank account rather than a hidden one.
3. Apply the same filtering/labeling to the remaining non-search bank dropdowns so behavior is consistent app-wide: Edit Deposit's bank list, the bulk/consolidated bill payment path, and the Reconcile Accounts account picker.
4. Leave the existing account search inputs alone — they already behave correctly.

## Notes

- Frontend only. No migrations, no changes to which accounts are excluded, and no change to the stored default (1010 stays the N Potomac default).
- Behavior for company-overhead transactions (no project) is unchanged: full tenant list, tenant names.

## Verification

- Open Pay Bill on an N Potomac bill: method shows "1010 - John Marshall" preselected; the list contains only project-enabled bank accounts, with Capital One and XYZ Credit Card absent.
- Open the same dialog on a project whose default is Capital One: Capital One still appears and is preselected.
