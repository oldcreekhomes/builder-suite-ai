# Fix the tripled Acquisition Closing Entry at 1020 Princess Street

## What actually happened (confirmed in the data)

The journal entry form is showing one entry, but the database really does contain **three separate "Acquisition Closing Entry" journal entries**, all dated 08/14/2026, each balancing at $2,473,165.47:

| Created (Aug 20) | Lines | Note |
|---|---|---|
| 19:55:03 | 10 | duplicate |
| 19:59:09 | 10 | duplicate |
| 20:03:55 | 28 | later edited at 21:09 — the good one, with lot-level job cost splits |

So the Balance Sheet is not tripling anything; it is correctly summing three real entries. Equity $70,000 x3, Loan - Land $2,000,000 x3, Deposits $1,000 x3, Capital One $398,688.27 x3 — matching the account detail screenshots exactly.

## Root cause

In the journal entry form, the "Save Entry" (stay) path creates a new entry but never records the new entry's id in the form. The form stays in "new entry" mode, so each additional click of Save Entry inserts another brand-new journal entry instead of updating the one just saved. Three clicks a few minutes apart produced three entries.

## Changes

1. **Clean up the data**
   - Delete the two duplicate journal entries (created 19:55 and 19:59) and their lines.
   - Keep the 20:03 entry with 28 lines, which carries the lot-level job cost detail.
   - Verify the Balance Sheet then shows Equity $70,000, Loan - Land $2,000,000, Deposits $1,000, Capital One cash-to-close $398,688.27 once each, and that Assets = Liabilities + Equity.

2. **Stop it from happening again**
   - After a successful create in "Save Entry" (stay) mode, latch the form onto the newly created entry so the next save updates it instead of inserting a duplicate.
   - Guard the save handlers against re-entry while a save is in flight (double-click / rapid re-click protection), in addition to the existing disabled-button state.

## Technical details

- Data cleanup runs as a migration deleting `journal_entry_lines` then `journal_entries` for ids `76039b35-fb06-4464-8e7d-01345d903797` and `ae7e453f-7395-43b6-83b9-18d029d0ab98`. No other entries are touched.
- Code change is in `src/components/journal/JournalEntryForm.tsx` (`handleSubmit`): set `currentJournalEntryId` / viewing mode from the created entry when `mode === 'stay'`, plus an in-flight save ref.
