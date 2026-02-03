
# Fix Balance Sheet Discrepancy: $7,007.20 Missing from Bank Account

## Summary

The Balance Sheet for "115 E. Ocean Watch Court" shows **$62,494.37** for Atlantic Union Bank, but the reconciled bank statement shows **$55,487.17**. The difference of exactly **$7,007.20** is caused by an orphaned journal entry that was marked as reversed but never properly cleaned up.

---

## Root Cause Analysis

### What Happened

A bill payment for $7,007.20 (Ref: 53500053280 to Ocean Sands Beach Boutique Inn for "4350 - Roof Trusses") was deleted or voided on January 21, 2026. When this happened:

1. The `reversed_at` timestamp was set on the journal entry
2. But the `reversed_by_id` was NOT set (no reversal entry was created)
3. The source bill_payment record was deleted from the database

This left the journal entry in an inconsistent "zombie" state - marked as reversed but with no actual reversal to offset it.

### Why the Balance Sheet is Wrong

The Balance Sheet code queries `journal_entry_lines` directly without joining to `journal_entries`, so it cannot filter out entries that have `reversed_at` set. It sums ALL journal entry lines for the project, including this orphaned entry.

| Entry | Debit | Credit | Status | Effect |
|-------|-------|--------|--------|--------|
| Bill Payment 12/15/2025 | - | $7,007.20 | `reversed_at` set, but `reversed_by_id` is NULL | Should NOT count, but IS counting |

---

## Solution

There are two ways to fix this, and I recommend doing BOTH:

### Part 1: Data Fix (Immediate)

Delete the orphaned journal entry and its lines since the source bill_payment no longer exists and the entry was marked as reversed:

```sql
-- Delete the orphaned journal entry lines first (due to foreign key)
DELETE FROM journal_entry_lines 
WHERE journal_entry_id = '21f636fc-072a-4d60-aa83-9a9a8106c1d6';

-- Delete the orphaned journal entry
DELETE FROM journal_entries 
WHERE id = '21f636fc-072a-4d60-aa83-9a9a8106c1d6';
```

After this fix, the balance sheet will show **$55,487.17** which matches the bank statement.

### Part 2: Code Fix (Preventive)

Update the Balance Sheet query to exclude reversed entries by joining with `journal_entries` and filtering out entries where `reversed_at IS NOT NULL` or `is_reversal = true`.

**File to modify**: `src/pages/BalanceSheet.tsx`

**Current query** (lines 63-73):
```typescript
let journalLinesQuery = supabase
  .from('journal_entry_lines')
  .select('account_id, debit, credit');

if (projectId) {
  journalLinesQuery = journalLinesQuery.eq('project_id', projectId);
} else {
  journalLinesQuery = journalLinesQuery.is('project_id', null);
}

const { data: journalLines, error: journalError } = await journalLinesQuery;
```

**Updated query**:
```typescript
// Query journal_entry_lines with journal_entries join to filter out reversed entries
let journalLinesQuery = supabase
  .from('journal_entry_lines')
  .select(`
    account_id, 
    debit, 
    credit,
    journal_entries!inner (
      reversed_at,
      reversed_by_id,
      is_reversal
    )
  `)
  .is('journal_entries.reversed_at', null)
  .is('journal_entries.reversed_by_id', null)
  .or('journal_entries.is_reversal.is.null,journal_entries.is_reversal.eq.false');

if (projectId) {
  journalLinesQuery = journalLinesQuery.eq('project_id', projectId);
} else {
  journalLinesQuery = journalLinesQuery.is('project_id', null);
}

const { data: journalLines, error: journalError } = await journalLinesQuery;
```

This ensures the balance sheet correctly excludes:
- Entries that have been reversed (`reversed_at IS NOT NULL`)
- Entries that have a reversal reference (`reversed_by_id IS NOT NULL`)
- Reversal entries themselves (`is_reversal = true`)

---

## Verification

After applying both fixes:

| Metric | Before | After |
|--------|--------|-------|
| Balance Sheet (1010) | $62,494.37 | $55,487.17 |
| Bank Statement | $55,487.17 | $55,487.17 |
| Difference | $7,007.20 | $0.00 |

---

## Technical Notes

- The orphaned entry is journal entry `21f636fc-072a-4d60-aa83-9a9a8106c1d6`
- It references bill_payment `d31e8ccf-c574-43f5-a9c0-93166f11cf5e` which no longer exists
- Entry date was 12/15/2025, marked as reversed on 01/21/2026
- The code fix aligns with the existing pattern documented in `memory/architecture/journal-entry-lines-reversal-filtering-pattern`
