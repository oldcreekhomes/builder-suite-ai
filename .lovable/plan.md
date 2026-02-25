

## Fix: Email Reports ignoring project account exclusions

### Problem
When sending the Balance Sheet and Income Statement via the "Email Reports" feature, all active accounts appear regardless of which accounts have been unchecked in the Edit Project dialog. The on-screen reports correctly filter using the `project_account_exclusions` table, but `SendReportsDialog.tsx` skips this step entirely.

### Fix

**File: `src/components/accounting/SendReportsDialog.tsx`**

**1. Balance Sheet section (around line 130-216)**
- Fetch `project_account_exclusions` for this project alongside the accounts query
- Build an `excludedAccountIds` Set from the results
- Skip excluded accounts when categorizing into assets/liabilities/equity
- This matches the pattern already used in `BalanceSheetContent.tsx`

**2. Income Statement section (around line 260-322)**
- Same approach: fetch exclusions and filter out excluded accounts before building revenue/expenses arrays
- This matches the pattern in `IncomeStatementContent.tsx`

### Technical Detail

Both sections will add a query:
```typescript
const { data: exclusions } = await supabase
  .from('project_account_exclusions')
  .select('account_id')
  .eq('project_id', projectId);

const excludedAccountIds = new Set(
  (exclusions || []).map(e => e.account_id)
);
```

Then filter accounts before processing:
```typescript
const filteredAccounts = accounts?.filter(a => !excludedAccountIds.has(a.id));
```

### Files Changed
| File | Change |
|------|--------|
| `src/components/accounting/SendReportsDialog.tsx` | Add exclusion filtering to both Balance Sheet and Income Statement PDF generation |

