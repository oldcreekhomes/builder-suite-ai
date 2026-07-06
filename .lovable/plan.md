## Problem

The Reconciliation Review dialog is showing every bill payment **twice** (Anchor Loans, City of Alexandria, Joel Cortes). After the backfill, both code paths in the dialog now match the same payment:

1. **New path** — reads `journal_entry_lines.reconciliation_id` (populated by backfill + fix).
2. **Legacy path** — reads `bills.reconciliation_id` (populated by an older code path).

The dedupe check compares `JE-line.id` against `bill.id` — different id namespaces, so it never matches and every payment shows up twice.

## Plan

1. In `ReconciliationReviewDialog.tsx`, expose the underlying `bill_id` on the JE-line path (already available as `journal_entries.source_id`).
2. Dedupe legacy entries by `bill_id` against the set of `bill_id`s already produced by the JE-line path.
3. Verify Feb 2026 reconciliation for 413 E Nelson now shows Anchor Loans, City of Alexandria, and Cortes exactly once, and the total matches.

## Technical details

- File: `src/components/transactions/ReconciliationReviewDialog.tsx`.
- Track a `Set<string>` of bill ids from the JE-line pass, then filter legacy bills with `!seenBillIds.has(bill.id)`.
- No database changes.