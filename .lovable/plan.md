## Change

In `src/components/bills/EditBillDialog.tsx`, resize the Job Cost tab row inputs to match the Expense tab's `h-10` height:

- Cost Code / Description inputs: `h-8` → `h-10` (lines ~1030, 1054).
- Quantity / Unit Cost numeric inputs: `h-7` → `h-10` (lines ~1075, 1090).
- Lot Select trigger and PO Selection dropdown: `h-8` → `h-10` (lines ~1139, 1171).
- Leave the trash/split icon buttons at `h-8 w-8` (they are icon buttons, not form fields).

No functional changes.

## Why

Expense tab inputs are `h-10` matching the top form; Job Cost inputs are shorter (`h-8`/`h-7`). Aligning to `h-10` makes both tabs visually consistent.
