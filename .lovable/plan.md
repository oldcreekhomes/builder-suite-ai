

## Widen Edit Bill Dialog

The Edit Bill dialog is currently capped at `max-w-4xl` (56rem / 896px), which is too narrow to display all line-item columns (Cost Code, Memo, Quantity, Cost, Total, Address, Purchase Order, Actions) without clipping.

### Change

**`src/components/bills/EditBillDialog.tsx`**

Change `max-w-4xl` to `max-w-6xl` on both `DialogContent` instances (lines 587 and 604). This increases the max width to 72rem (1152px), giving enough room for all columns to be readable without changing any column widths.

