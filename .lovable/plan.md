

# Eliminate Timezone Date Bugs Permanently

## The Problem

Every time a date-only string like `"2026-01-31"` is passed to `new Date()`, JavaScript parses it as **UTC midnight**. In US timezones, that shifts backward one day. This has caused repeated bugs across the app (closed books dates, transaction dates, report dates, etc.).

## The Solution

### 1. Add a Safe Formatting Function to `src/utils/dateOnly.ts`

Add a single utility that combines local parsing with date-fns formatting:

```typescript
import { format as dateFnsFormat } from "date-fns";

/**
 * Safely format a YYYY-MM-DD date string for display.
 * Parses as LOCAL time (not UTC) to avoid off-by-one day bugs.
 */
export const formatDateSafe = (dateStr: string, formatPattern: string): string => {
  if (!dateStr) return '';
  const localDate = toDateLocal(dateStr.split('T')[0]); // strip any time portion
  return dateFnsFormat(localDate, formatPattern);
};
```

### 2. Sweep All Files Using Unsafe `new Date()` on Date-Only Strings

Replace every instance of `format(new Date(someDate), pattern)` with `formatDateSafe(someDate, pattern)` across 20+ files. The key files include:

| File | Approx. Instances |
|---|---|
| CloseBooksPeriodManager.tsx | 3 (period_end_date) |
| PODetailsDialog.tsx | 1+ |
| JobCostActualDialog.tsx | 1+ |
| JournalEntrySearchDialog.tsx | 2 |
| CheckSearchDialog.tsx | 2 |
| CreditCardSearchDialog.tsx | 2 |
| SendSingleCompanyEmailModal.tsx | 2 |
| FromBidsTab.tsx | 1 |
| ReconciliationReviewDialog.tsx | 2 |
| ReconcileAccountsContent.tsx | multiple |
| BankReconciliation.tsx | multiple |
| useBankReconciliation.ts | multiple (sorting) |
| Other report/transaction files | various |

**Note:** Some places already use the `+ "T00:00:00"` or `+ "T12:00:00"` workaround. These will also be replaced with `formatDateSafe` for consistency.

Fields that are **full timestamps** (like `closed_at`, `created_at`, `reopened_at`) are fine with `new Date()` and will be left as-is.

### 3. What This Achieves

- **One function** to remember: `formatDateSafe(dateStr, pattern)` -- works correctly every time
- **No more timezone bugs** on date-only fields from the database
- **Consistent pattern** across the entire codebase -- any future developer (or AI) just uses this function
- **You never have to report this bug again**

## Technical Details

- Only `date-fns` format patterns change (imported once in dateOnly.ts)
- The `toDateLocal` function already exists and is correct -- it creates `new Date(year, month-1, day)` which uses **local** timezone
- Sorting comparisons using `new Date(a.date).getTime()` will also be updated to use `toDateLocal` to prevent subtle sort bugs near midnight UTC

