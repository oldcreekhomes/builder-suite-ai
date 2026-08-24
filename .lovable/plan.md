# Show the project's account name on Journal Entries

## What's happening

The account you picked is correct — it's the right account, saved correctly. Only the label is wrong.

Account code 1010 has a company-wide name of "Atlantic Union Bank" and a project-specific name of "John Marshall" at 2401 N Potomac (confirmed in the database: the project override exists and reads "John Marshall").

Most screens (Write Checks, Make Deposits, Reconcile, Balance Sheet, Income Statement, the account picker itself) already resolve the project-specific name. The Journal Entry form does not: when it loads an existing entry's lines it builds the label straight from the company-wide account name, so it shows "Atlantic Union Bank" even though the picker's dropdown lists "John Marshall".

## The fix

In the Journal Entry form, resolve account labels through the same project name-override lookup the rest of the app uses, so a loaded line for 1010 reads "1010 - John Marshall" on this project. No data changes, no change to what gets saved.

## Technical detail

- `src/components/journal/JournalEntryForm.tsx`: add `useProjectAccountNames(projectId)` and use `resolveAccountName` when composing `account_display` (currently `${line.accounts.code} - ${line.accounts.name}` at line 380). Apply the same resolution anywhere else in the form that renders an account name from raw account data.
- No migration; `project_account_overrides` already holds the "John Marshall" mapping.
