

## Plan: Manual tab header + Unit cell polish

### 1. Cost Code on one line
"Cost Code" header currently wraps to two lines because the column is too narrow. Widen the Cost Code column slightly and add `whitespace-nowrap` to the header so "Cost Code" stays on a single line.

### 2. Unit options as 2-letter abbreviations
Update the shared `MANUAL_UNIT_OPTIONS` constant in `BudgetDetailsModal.tsx` to use `{ value, label }` pairs:
- CY — Cubic Yard
- EA — Each
- LF — Linear Feet
- SF — Square Feet
- SY — Square Yard

The dropdown list shows the 2-letter code as the option label (e.g. "CY"), and the selected trigger displays the same 2-letter code. Stored value in `unit_of_measure` becomes the 2-letter code (`CY`, `EA`, `LF`, `SF`, `SY`).

Note: existing rows saved with full names ("Cubic Yard", etc.) will simply not match a current option; the trigger will fall back to "Select" until re-saved. Acceptable since this feature was just shipped and unlikely to have legacy data.

### 3. Unit column width = width of "Unit"
Shrink the Unit column to fit just the word "Unit" plus the 2-letter dropdown. Use `w-16` (~64px) on the header/cell and remove the wider `<SelectTrigger>` width.

### 4. Header alignment
- Left-align all headers: Cost Code, Description, Notes, Unit Price, Quantity, Total.
- Center-align Unit header (over the dropdown).
- Center-align Actions header AND the 3-dot button cell content.

Currently Total/Actions or others may be right/left mixed — explicitly set:
- `text-left` on: Cost Code, Description, Notes, Unit Price, Quantity, Total
- `text-center` on: Unit, Actions
- Actions cell body: `flex justify-center` for the 3-dot menu trigger

### Files to change
- `src/components/budget/BudgetDetailsModal.tsx` — header classes, column widths, MANUAL_UNIT_OPTIONS shape, Select rendering, Actions cell alignment.

### Out of scope
No DB changes, no changes to other tabs, no changes to allocation/save logic.

### Validation
1. "Cost Code" header renders on one line.
2. Unit dropdown shows CY, EA, LF, SF, SY (alphabetical by code).
3. Unit column is just wide enough for the word "Unit".
4. All headers left-aligned except Unit and Actions (centered); 3-dot button centered in its cell.

