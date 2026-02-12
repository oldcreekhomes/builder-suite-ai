

# Fix: Auto-Close Earlier Open Periods and Prevent Illogical States

## Problem
September 30, 2025 shows as "Open" even though October 31, 2025 and January 31, 2026 are both "Closed." A period cannot logically be open if a later period is already closed -- everything before a closed date is locked by definition.

## Root Cause
When closing October 31, the system did not check for (or auto-close) any earlier periods that were still in "open" status. The reopen/close workflow left orphaned open periods behind.

## Fix: Two Changes

### 1. Auto-close earlier open periods when closing a new period
In `src/hooks/useAccountingPeriods.ts`, after successfully closing a period, add logic to also close any earlier periods that are still marked "open" for the same project.

At the end of the `closePeriodMutation` mutation function, add:

```
// Auto-close any earlier periods still marked 'open'
await supabase
  .from('accounting_periods')
  .update({ status: 'closed', closed_at: new Date().toISOString(), closed_by: user.id })
  .eq('owner_id', ownerId)
  .eq('project_id', projectId)
  .eq('status', 'open')
  .lt('period_end_date', periodEndDate);
```

### 2. Fix the existing bad data (Sept 30 for 412 E Nelson)
Query the database to find the Sept 30 open period and update it to "closed" so the display is immediately correct without waiting for the user to close another period.

## What This Achieves
- The Sept 30, 2025 period will immediately show as "Closed"
- Any future period closure will automatically clean up earlier open periods
- No more illogical states where an earlier period is open while a later one is closed
- Transaction locking already works correctly (uses latest closed date), so this is purely a data/display consistency fix
