

## Phase 1: Standardize Settings Tables to shadcn/ui Defaults

### Overview
Reset the base table component to match shadcn/ui defaults and clean up inline overrides in all Settings tab tables. This is a styling-only change -- no logic or functionality is affected.

### What Changes

**1. Reset base `src/components/ui/table.tsx`**

| Component | Current | shadcn Default |
|-----------|---------|----------------|
| Table wrapper | `max-h-[70vh]` | `relative w-full overflow-auto` (no max-height) |
| TableHeader | `sticky top-0 bg-background z-20 shadow-sm [&_tr]:border-b` | `[&_tr]:border-b` only |
| TableHead | `h-10 px-2 bg-background border-b` | `h-12 px-4 font-medium text-muted-foreground` |
| TableCell | `p-2` | `p-4` |

**2. Clean up inline overrides in Settings tables**

These files have `px-2 py-1`, `text-xs`, `h-10`, or other compact overrides that need removal so the base defaults flow through:

- **CompaniesTable.tsx** -- Remove `h-10` on TableRow, `px-2 py-1` on every TableCell, `text-xs` font sizes
- **RepresentativesTable.tsx** -- Remove `h-10` on TableRow, `px-2 py-1` on every TableCell, `text-xs` font sizes

These files are already clean (no overrides beyond structural ones like `text-right`, `font-medium`):
- **ChartOfAccountsTab.tsx** -- Already clean
- **CostCodesTable.tsx / CostCodeTableRow.tsx / CostCodeGroupRow.tsx** -- Already clean
- **SpecificationsTable.tsx / SpecificationTableRow.tsx / SpecificationGroupRow.tsx** -- Already clean
- **EmployeeTable.tsx** -- Already clean

**3. Standardize table wrappers**

- **CompaniesTable.tsx** -- Currently uses bare `div className="border rounded-lg overflow-hidden"`. Switch to `SettingsTableWrapper` for consistency.
- **RepresentativesTable.tsx** -- Same treatment.

### What Does NOT Change
- No logic, data, or behavior changes
- Structural classes like `text-right`, `text-center`, `font-medium`, `capitalize` stay
- Budget, Purchase Orders, Bidding, Issues, and dialog tables are untouched (Phase 2)
- The custom props on Table (`containerClassName`, `containerRef`, `onContainerScroll`) remain available for Phase 2 tables that need scroll control

### Technical Details

Files modified:
1. `src/components/ui/table.tsx` -- 4 class string changes
2. `src/components/companies/CompaniesTable.tsx` -- Remove inline padding/sizing overrides, use SettingsTableWrapper
3. `src/components/representatives/RepresentativesTable.tsx` -- Remove inline padding/sizing overrides, use SettingsTableWrapper

### Risk
Very low. Only visual spacing changes in Settings. All other tables inherit the new defaults but won't look dramatically different since they already use similar sizing. Budget tables (Phase 2) may look slightly more spacious, which we will address later.

