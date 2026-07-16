## Fix wiring + tighten row layout in Multi-Deposit table

**File:** `src/components/multi-entry/MultiDepositTable.tsx` (plus tiny helper prop on `DateInputPicker`)

### 1) Received From — match single-project Make Deposits exactly
Today's row already uses `VendorSearchInput`, but the wiring differs from the deposit page (which sets the company ID from `onChange` and the display name via `displayValue`). Rewire the row to mirror it:
- `value={r.receivedFromCompanyId}`
- `displayValue={r.receivedFromName}`
- `onChange={(companyId) => updateRow(r.id, { receivedFromCompanyId: companyId })}`
- `onCompanySelect={(company) => updateRow(r.id, { receivedFromName: company.company_name })}`
- `placeholder="Search subcontractors or vendors"`

Result: identical company list (all home-builder companies via `useCompanySearch`) and identical selection behavior.

### 2) Account — match single-project Make Deposits exactly
The row already uses `AccountSearchInputInline` with `projectId`. Align the props one-for-one with the deposit page's "Chart of Accounts" row:
- Pass `projectId={r.projectId}` (undefined until a project is picked — matches deposit page)
- Use the same `onChange` reset behavior: clearing text resets `accountId`
- Placeholder: `"Select account..."`
No `accountType` filter (so full COA is returned, exactly like the deposit page's Chart of Accounts tab).

### 3) Remove the calendar icon button next to each row's date
- Add a small optional prop `hideCalendarButton?: boolean` to `src/components/ui/date-input-picker.tsx`. When true:
  - Don't render the trailing `<PopoverTrigger><Button><CalendarIcon/></Button></PopoverTrigger>`.
  - Open the popover when the user clicks/focuses the input (attach `onClick` / `onFocus` handlers that call `setIsOpen(true)`).
- In `MultiDepositTable`, pass `hideCalendarButton` on every per-row `DateInputPicker`. Leave the header's Default-Date picker unchanged so the calendar icon stays there.
- No changes to any other consumer of `DateInputPicker`.

### 4) Rebalance row widths — smaller Amount, wider Description
Current header widths:

```text
Project 220 | Date 140 | Bank 200 | Received 200 | Check 110 | Account 220 | Description (flex) | Amount 140 | trash 48
```

New widths:

```text
Project 220 | Date 120 | Bank 200 | Received 200 | Check 90 | Account 220 | Description (flex, wider) | Amount 90 | trash 40
```

Changes:
- Date column: `w-[140px]` → `w-[120px]` (calendar button removed, input alone fits).
- Amount column: `w-[140px]` → `w-[90px]` (~half current width). Input keeps `text-right`.
- Trash column: `w-12` → `w-10` (tighter).
- Description remains the only flex column, so it automatically absorbs all reclaimed space (~80px total).

### Out of scope
- No database, RLS, or edge-function changes.
- No changes to the header Default-Date control, the batch save flow, or the Batches history section.
- No changes to `AccountSearchInputInline` or `VendorSearchInput` internals — only the props we pass.