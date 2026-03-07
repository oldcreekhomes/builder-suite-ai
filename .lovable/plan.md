

## Fix: EditCheckDialog Broken Grid Layout

The line items table is broken because `grid-cols-16` is not defined in the Tailwind config. Only `grid-cols-20`, `grid-cols-24`, and `grid-cols-25` are custom-defined (alongside Tailwind's default 1-12).

The dialog uses `grid-cols-16` when there's no address column, causing the grid to collapse and stack all columns vertically.

### Fix

**Option A (match existing patterns):** Change `grid-cols-16` to `grid-cols-12` (standard Tailwind) and redistribute column spans to total 12:
- Cost Code/Account: `col-span-4`
- Memo: `col-span-3`
- Amount: `col-span-2`
- Action: `col-span-3`

**Option B (preferred, match EditDepositDialog):** Use `grid-cols-20` (already in config) for the non-address case, keeping the current span distribution (5+4+3+4=16, bump Action to 8 to fill 20). This matches the EditDepositDialog pattern exactly.

### Changes

**`src/components/checks/EditCheckDialog.tsx`:**
- Replace all `grid-cols-16` with `grid-cols-20`
- Adjust Action column from `col-span-4` to `col-span-8` in the non-address case
- In the footer totals row, adjust the empty spacer from `col-span-4` to `col-span-8`

**`tailwind.config.ts`:** No changes needed -- `grid-cols-20` already exists.

