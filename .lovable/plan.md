

## Three UI Tweaks to PO Details Dialog

### Changes

**File: `src/components/bills/PODetailsDialog.tsx`**

1. **Rename "Pending" back to "This Bill"** in both places:
   - Summary header label (line 144): `Pending` back to `This Bill`
   - Column header (line 171): `Pending` back to `This Bill`

2. **Remove dotted underlines from Billed column values**: In the `BilledAmountWithTooltip` component (line 48), remove `border-b border-dotted border-current cursor-help` classes. The tooltip still works on hover -- users can discover it naturally without the visual indicator.

3. **Make Remaining green when positive, red when negative** (for the pending case too):
   - Line item remaining (lines 210-213): When pending, use `text-green-700` if remaining > 0, `text-destructive` if < 0
   - Summary header remaining (lines 150-153): Same logic -- green if positive, red if negative
   - Totals row remaining (lines 250-253): Same logic

### What stays the same

- All other styling and layout
- Dialog width (max-w-4xl)
- Tooltip content still appears on hover (just no dotted underline hint)
- The green highlight on billed amounts that match the current bill (`bg-green-100 text-green-700`) stays

