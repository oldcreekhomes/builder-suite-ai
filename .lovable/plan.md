

## Root Cause: Supabase 1000-Row Query Limit

**The Balance Sheet is WRONG ($4,000). The Account Detail Dialog is CORRECT ($0).**

The Balance Sheet query fetches all `journal_entry_lines` for a project to aggregate balances. This project has **1,109 journal entry lines**, but Supabase's default limit returns only **1,000 rows**. The truncated dataset produces incorrect balances. The console even confirms: `"Processing 1000 journal lines"` -- it should be 1,109.

The Account Detail Dialog queries per-account (only ~32 lines for Equity Partner #1), so it gets all rows and calculates correctly: $0.

The Income Statement has the same bug (also queries all `journal_entry_lines` without pagination). The Job Costs report queries by cost_code_id and could also be affected.

### Fix: Paginated Fetch Utility

Create a reusable helper that fetches all rows by paginating through Supabase in batches of 1,000, then apply it to all report queries.

**New file: `src/lib/supabasePaginate.ts`**
- Export an `async function fetchAllRows()` that accepts a Supabase query builder, calls `.range()` in a loop (0-999, 1000-1999, etc.), and concatenates results until a batch returns fewer than 1,000 rows.

**Modified files:**

| File | Change |
|---|---|
| `src/lib/supabasePaginate.ts` | New utility for paginated fetching |
| `src/components/reports/BalanceSheetContent.tsx` | Replace single query with paginated fetch (~line 97-121) |
| `src/components/reports/IncomeStatementContent.tsx` | Replace single query with paginated fetch (~line 81-95) |
| `src/components/reports/JobCostsContent.tsx` | Replace single query with paginated fetch (~line 177+) |
| `src/components/accounting/AccountDetailDialog.tsx` | Apply pagination to the main journal_entry_lines query (~line 117-168) as a safety measure |

No database changes required.

