## Fix plan

I will change only the description sourcing in the Edit Extracted Bill dialog so it reads the actual invoice line notes again.

## What I found
- The PDF confirms the real line descriptions are the invoice `Notes` values, such as:
  - `Time: Transmittal to B. Dofflemyer et al re: Deed of Easement and City execution status.`
- In `src/components/bills/EditExtractedBillDialog.tsx`, the dialog currently hydrates each line like this:
  - `memo: line.memo || (line.description && line.description.length <= 120 ? line.description : "") || ""`
- That means if `pending_bill_lines.memo` contains the rolled-up summary text (`Attorney: Duncan Blair`), the UI shows that instead of the real extracted invoice line description.
- The file also already keeps the original invoice text separately in `matchingText: line.description || line.memo || ""`, so the source data is still there.

## What I will change
1. Update the line hydration in `src/components/bills/EditExtractedBillDialog.tsx` for:
   - job cost lines
   - promoted expense-to-job-cost lines
   - expense lines
2. Make the visible Description field prefer the invoice line description first, and only fall back to `memo` if the description is empty.
3. Leave PO matching, quantity, unit cost, totals, grouping, vendor, dates, and every other behavior unchanged.

## Exact behavior after the fix
The Description column will load like this:
- first choice: `line.description`
- fallback only if missing: `line.memo`

So for this invoice, rows will show values like:
- `Time: Transmittal to B. Dofflemyer et al re: Deed of Easement and City execution status.`
- instead of `Attorney: Duncan Blair`

## What I will not change
- No spinner/input changes
- No PO logic changes
- No save logic changes
- No grouping logic changes
- No extraction pipeline changes
- No other UI/layout changes

## Technical details
Target file:
- `src/components/bills/EditExtractedBillDialog.tsx`

Target lines are the three current mappings that set:
- `memo: line.memo || (line.description ... )`

They will be reversed to prefer the invoice description while preserving `matchingText` for PO matching.

Reply `approve` and I’ll apply only this description fix.