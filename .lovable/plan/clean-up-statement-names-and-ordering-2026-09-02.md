# Clean Up Statement Names and Ordering

Statements at 228 South Washington are all assigned to accounts, but the file names still show raw upload paths ("2025/Sandy Spring Bank/06. June 2025.pdf", "2026 | May_1.pdf", "2025-04-18.pdf"). Goal: one consistent label per statement, sorted newest to oldest inside each account.

## New label format

Every statement displays as its statement period, derived from the statement end date already stored on each record:

```text
June 2025
May 2025
April 2025
```

- When two statements land in the same month for the same account, the later ones get a suffix: `April 2025 (2)`, `April 2025 (3)` — ordered by upload date, so nothing is lost or overwritten.
- Statements with no end date show the cleaned original file name (folder path stripped) and sort to the bottom of their account, so they are easy to spot and fix.

## Ordering

Each account section sorts newest statement period first, oldest last. When two share the same period, newest upload comes first. Undated ones sit at the end.

## Other cleanup in the same pass

- Hide the leftover placeholder record in the "AMEX 35003" group so the account shows as empty rather than holding a fake file.
- Keep the true original file name available on hover, and keep downloads using a clean file name (e.g. `June 2025.pdf`).

## Technical notes

- Display-only change in `src/components/accounting/BankStatementsDialog.tsx`: replace `displayName()` with a label builder that formats `statement_date` as `MMMM yyyy`, applies duplicate suffixes per account group, and falls back to the basename of `original_filename`.
- Update `sortRows` to sort by `statement_date` descending with nulls last, tie-broken by `created_at` descending.
- Search matches both the new label and the original file name.
- No database writes; `original_filename` and storage paths stay untouched, so nothing breaks for existing downloads or other projects.
