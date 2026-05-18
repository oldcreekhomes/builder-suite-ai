## Problem

In `EditExtractedBillDialog.tsx` (the "Edit Extracted Bill" dialog shown from the Review tab), the Description cell renders the `<Input>` inside two different parent trees depending on whether the field has any text:

- empty → bare `<Input>`
- has text → `<Tooltip><TooltipTrigger asChild><Input/></TooltipTrigger>...</Tooltip>`

The moment the user types the first character, the value becomes truthy, React swaps to the other branch, and the input is unmounted and a new one is mounted in its place. The new input is not focused, so the cursor disappears and every subsequent keystroke is lost until the user clicks back in. The Cost Code cell has the same shape and the same latent bug.

## Fix

Render a single, stable `<Input>` for the Description cell (and the same for Cost Code) so the element is never swapped between trees while typing. Keep the hover tooltip behavior, but mount the Tooltip wrapper unconditionally and only vary the tooltip *content* (or simply omit the tooltip on these inline inputs — they already show their full value in the field and via native title on hover).

Concretely:

1. Description cell (around lines 1367–1400): collapse the two branches into one. Always render:
   ```
   <Tooltip>
     <TooltipTrigger asChild>
       <Input className="h-8 truncate" value={group.memo || ""} onChange={...} />
     </TooltipTrigger>
     {group.memo ? <TooltipContent ...>{group.memo}</TooltipContent> : null}
   </Tooltip>
   ```
   The Input now lives in the same parent tree on every render, so typing no longer remounts it.

2. Cost Code cell (around lines 1300–1365): apply the same collapse so the `<CostCodeSearchInput>` is rendered in one stable tree, with `TooltipContent` conditionally rendered instead of the whole wrapper.

3. No other behavior changes: same styling, same onChange logic, same tooltip-on-hover for filled values.

## Scope

- File: `src/components/bills/EditExtractedBillDialog.tsx` only.
- No data, schema, or workflow changes.
- Verify by opening Review → Edit Extracted Bill and typing freely in Description and Cost Code without losing focus.
