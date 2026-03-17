

## Add Date Range Filter and Search to Account Detail Dialog

**What**: Add two date pickers (From/To) and a search input to the AccountDetailDialog header, allowing users to filter the transaction list by date range and search across Name, Account, and Description fields.

**Where**: `src/components/accounting/AccountDetailDialog.tsx`

### Changes

**1. Add state variables** (near line 86):
- `dateFrom: Date | undefined` — start of date range filter
- `dateTo: Date | undefined` — end of date range filter  
- `searchQuery: string` — text search filter
- Reset all three when dialog opens (in the existing `useEffect` at line 95)

**2. Add filter controls to the dialog header** (after the Hide Paid toggle area, ~line 1049):
Add a row below the title containing:
- Two `DateInputPicker` components (already exists in the project) for From and To dates, using the compact style matching the Approved tab
- A search `Input` with placeholder "Search..." on the right side
- Layout: `flex items-center gap-2` with search pushed to `ml-auto`

**3. Apply client-side filtering** (extend the existing `displayedTransactions` filter at line 1012):
- Date range: filter `txn.date >= dateFrom` and `txn.date <= dateTo` (when set)
- Search: case-insensitive match against `txn.reference` (Name), `txn.accountDisplay` (Account), `txn.description` (Description), `txn.memo`, and type label

**4. Recalculate running balance** on filtered results (already happens — `balances` is computed from `displayedTransactions`)

### UI Layout (below title bar)
```text
┌─────────────────────────────────────────────────────────┐
│ 1010 - Atlantic Union Bank                  [Hide Paid] │
│ [From date] [📅]  [To date] [📅]         [🔍 Search...] │
├─────────────────────────────────────────────────────────┤
│ Type | Date | Name | Account | Description | ...       │
```

### Files touched
- `src/components/accounting/AccountDetailDialog.tsx` — add imports for `DateInputPicker` and `Input`, add state, add filter row UI, extend filter logic

No new components, no database changes. Pure client-side filtering on already-fetched data.

