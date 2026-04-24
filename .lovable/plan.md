## Fix plan

The actual issue is not the data or the dialog layout.
The issue is that the `Quantity` and `Unit Cost` fields in `EditExtractedBillDialog.tsx` are still rendering as native `type="number"` inputs without the spinner-removal classes, so Chrome is still showing the up/down counters.

Do I know what the issue is?
Yes.

## Files isolated
- `src/components/bills/EditExtractedBillDialog.tsx`
- `src/components/ui/input.tsx`
- Reference pattern already used elsewhere: `src/components/bills/EditBillDialog.tsx`

## What I will change
1. Update the `Quantity` and `Unit Cost` inputs in the Job Cost table inside `EditExtractedBillDialog.tsx`.
2. Apply the same spinner-removal classes already used elsewhere in the app:
   - `[appearance:textfield]`
   - `[&::-webkit-outer-spin-button]:appearance-none`
   - `[&::-webkit-inner-spin-button]:appearance-none`
3. Apply the same treatment to the matching `Quantity` and `Unit Cost` inputs in the Expense section of the same dialog so both areas behave consistently.

## What I will not change
- No description logic
- No grouping logic
- No totals/math
- No PO matching
- No layout changes
- No global input component changes unless absolutely necessary

## Technical details
I checked the current code and confirmed:
- `EditExtractedBillDialog.tsx` still has plain `type="number"` inputs for these fields.
- The shared `Input` component does not remove spinners globally.
- Other bill-editing screens already use the Tailwind spinner-removal classes successfully.
- MDN confirms `appearance` and WebKit spin-button pseudo-elements are the relevant CSS hooks for this behavior.

## Why this happened
The earlier change was not actually applied to the live code, so the dialog is still using the old class names and native browser counters remain visible.

Reply `approve` and I’ll apply only this spinner-removal fix.

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>

<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>