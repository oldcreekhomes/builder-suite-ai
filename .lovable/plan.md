

## Fix EditDepositDialog Broken Grid Layout

### Root Cause

The line items grid uses `grid-cols-17` which is **not defined** in the Tailwind config. Only `grid-cols-20` and `grid-cols-24` are custom-defined. Since Tailwind doesn't recognize `grid-cols-17`, it generates no CSS, causing all columns to stack vertically -- making the dialog massive.

### Fix

**File: `src/components/deposits/EditDepositDialog.tsx`**

Change the grid system to match EditBillDialog's approach:
- **Without address column**: Use `grid-cols-20` (instead of broken `grid-cols-17`)
- **With address column**: Use `grid-cols-24` (instead of `grid-cols-20`)

Adjust column spans to fill the new grid properly:

| Column | Without Address (20 cols) | With Address (24 cols) |
|--------|--------------------------|----------------------|
| Account/Cost Code | col-span-5 | col-span-5 |
| Description | col-span-5 | col-span-5 |
| Qty | col-span-2 | col-span-2 |
| Cost | col-span-3 | col-span-3 |
| Total | col-span-3 | col-span-3 |
| Address | -- | col-span-4 |
| Action | col-span-2 | col-span-2 |

Update all 4 grid locations (header, rows, footer) to use `grid-cols-20` / `grid-cols-24` with corrected col-spans that sum correctly. Also fix the footer col-span to match the new totals.

### Files Changed
| File | Change |
|------|--------|
| `src/components/deposits/EditDepositDialog.tsx` | Replace `grid-cols-17` with `grid-cols-20` and `grid-cols-20` with `grid-cols-24` throughout `renderLineItems` |

