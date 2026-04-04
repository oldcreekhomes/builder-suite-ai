

## Restructure Taxes as Removable Item with Sub-fields, Fix Tooltip & Add Confirmation

### Changes to `src/pages/apartments/ApartmentInputs.tsx`

**1. Make "Taxes" a removable optional expense**
- Add a `Taxes` entry to the `OPTIONAL_EXPENSES` array (alphabetically, between "Trash Removal" and "Utilities"). It will be a special computed (non-editable) row displaying `computed.taxes`.
- Remove the current fixed Tax Rate, Estimated Value, and Taxes rows from the left card top.
- When Taxes is visible, render it as a non-editable removable row followed by two indented sub-rows: "Tax Rate" (editable, format number) and "Estimated Value" (editable, format currency). These sub-rows get `pl-4` indent.
- When Taxes is removed, Tax Rate and Estimated Value also hide, and both values reset to 0.

**2. Update column balancing**
- Remove the `fixedRowCount = 3` adjustment since there are no more fixed rows. Revert to simple `Math.ceil(n/2)` split. Each "Taxes" group counts as 3 rows (Taxes + Tax Rate + Estimated Value) for balancing purposes.

**3. Replace `title="Remove"` with standard Tooltip**
- Import `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` from `@/components/ui/tooltip`.
- Wrap the X button in `RemovableEditableRow` with a Tooltip displaying "Remove" instead of using the HTML `title` attribute.

**4. Add delete confirmation dialog**
- Import `DeleteConfirmationDialog` from `@/components/ui/delete-confirmation-dialog`.
- When the X button is clicked, show a confirmation dialog ("Are you sure you want to remove {label}?") before actually removing the expense.

### File Changed
- `src/pages/apartments/ApartmentInputs.tsx`

