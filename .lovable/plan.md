## Plan

### Problem
In the Create Purchase Order dialog (`src/components/CreatePurchaseOrderDialog.tsx`), the line item input fields (Cost Code, Description, Quantity, Unit Cost) are rendered with `h-8 text-sm`, making them visibly smaller/shorter than the Company and Notes inputs at the top of the dialog which use the default shadcn Input height (`h-9`). Additionally, the Description input does not stretch to fill its table cell, leaving awkward empty space between the Amount and Extra columns.

### Changes
All edits are in `src/components/CreatePurchaseOrderDialog.tsx`:

1. **Unify input heights**
   - Remove `h-8 text-sm` from all line item inputs so they use the default shadcn `Input` height, matching the Company and Notes fields:
     - `CostCodeSearchInput` (2 instances)
     - `Input` for Description (2 instances)
     - `Input` for Quantity (1 instance)
     - `Input` for Unit Cost (1 instance)
   - Update the locked-display divs for Quantity and Unit Cost to remove `h-8 text-sm` so they remain vertically aligned with the editable inputs.
   - Preserve functional classes (`text-center`, `no-spinner`, cursor styles) on each element.

2. **Widen Description**
   - Add `w-full` to both Description `Input` instances so the field stretches across its table cell and fills the available horizontal space.

3. **Align Amount text**
   - Remove `text-sm` from the read-only Amount cell so its font size matches the now-default-size inputs in the same row.

### No schema or data changes needed — this is a purely presentational CSS update.