

## Fix Reports Page: Calendar Whitespace and Table Alignment

### Problem 1: Calendar Button Has Too Much Whitespace
The "As of March 2nd, 2026" date picker button uses `w-[300px]`, which creates excess white space to the right of the calendar icon. It should auto-size to fit its content.

### Problem 2: Assets/Liabilities Tables Too High
The `ReportsTabs` content wrapper uses `pt-0` top padding. Per the application standard, it should be `pt-3` so the content's top border aligns with the project dropdown in the sidebar.

### Changes

**File: `src/components/reports/ReportsTabs.tsx`**
- Line 33: Change `pt-0` to `pt-3` in the content wrapper padding.

**File: `src/components/reports/BalanceSheetContent.tsx`**
- Line 385: Change `w-[300px]` to `w-auto` on the header action date picker button.
- Line 409: Change `w-[300px]` to `w-auto` on the fallback inline date picker button.

These same changes will be checked across the other report content files (IncomeStatementContent, JobCostsContent, AccountsPayableContent) if they also emit a date picker with a fixed width.

