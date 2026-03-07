
## Share "As of Date" Across All Report Tabs

### Problem
Each report tab (Balance Sheet, Income Statement, Job Costs, Accounts Payable) maintains its own independent `asOfDate` state initialized to `new Date()`. When you change the date on one tab and switch to another, it resets to today.

### Solution
Lift the `asOfDate` state up to `ReportsTabs` and pass it down to all four child components as a prop. When the Reports page unmounts (user navigates away), the state naturally resets since it lives in a component that gets destroyed.

### Changes

**1. `src/components/reports/ReportsTabs.tsx`**
- Add `asOfDate` / `setAsOfDate` state (initialized to today)
- Pass `asOfDate` and `onAsOfDateChange` props to all four content components

**2. `src/components/reports/BalanceSheetContent.tsx`**
- Add `asOfDate` and `onAsOfDateChange` to the props interface
- Remove the local `useState<Date>(new Date())` for `asOfDate`
- Replace all `setAsOfDate(date)` calls with `onAsOfDateChange(date)`

**3. `src/components/reports/IncomeStatementContent.tsx`**
- Same pattern: accept `asOfDate` and `onAsOfDateChange` as props, remove local state

**4. `src/components/reports/JobCostsContent.tsx`**
- Same pattern: accept `asOfDate` and `onAsOfDateChange` as props, remove local state

**5. `src/components/reports/AccountsPayableContent.tsx`**
- Same pattern: accept `asOfDate` and `onAsOfDateChange` as props, remove local state

### Technical Detail
Each file's change is minimal:
- Add two props to the interface (`asOfDate: Date`, `onAsOfDateChange: (date: Date) => void`)
- Delete the `const [asOfDate, setAsOfDate] = useState<Date>(new Date())` line
- Replace `setAsOfDate` with `onAsOfDateChange` in calendar `onSelect` handlers

No query logic, formatting, or PDF export code needs to change since they all already reference the `asOfDate` variable by name.
