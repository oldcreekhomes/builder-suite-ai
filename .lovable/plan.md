## Goal
Refine the Confirm PO line items table in `src/components/bidding/ConfirmPODialog.tsx`:
1. Eliminate awkward white space — shrink the **Qty** column to roughly half its current width.
2. **Left-align all headers** (Cost Code, Description, Qty, Unit Cost, Proposal, Amount, Extra).
3. **Remove the up/down spinner arrows** from the Qty and Unit Cost number inputs (users will type values directly).

## Changes — `src/components/bidding/ConfirmPODialog.tsx`

### 1. Headers (lines 276–283)
Change column widths and remove `text-right` / `text-center` so everything is left-aligned (default):

```tsx
<TableHead className="w-[200px]">Cost Code</TableHead>
<TableHead>Description</TableHead>
<TableHead className="w-[60px]">Qty</TableHead>          {/* was w-[80px] text-right → halved-ish + left */}
<TableHead className="w-[110px]">Unit Cost</TableHead>   {/* removed text-right */}
<TableHead className="w-[70px]">Proposal</TableHead>     {/* removed text-center */}
<TableHead className="w-[110px]">Amount</TableHead>      {/* removed text-right */}
<TableHead className="w-[60px]">Extra</TableHead>        {/* removed text-center */}
<TableHead className="w-[50px]"></TableHead>
```

> Note: The freed pixels from shrinking Qty (80→60) plus removing right-alignment will let the Description column expand naturally, eating the empty space currently sitting to the right of Proposal.

### 2. Cell alignment (lines 313–331)
Remove `text-right` from Qty and Unit Cost inputs so the entered values left-align under the headers:

```tsx
// Qty input
<Input
  type="number"
  value={line.quantity || ''}
  onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
  className="h-8 text-sm px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
  min={0}
/>

// Unit Cost input
<Input
  type="number"
  step="0.01"
  value={line.unit_cost || ''}
  onChange={(e) => updateLine(idx, { unit_cost: parseFloat(e.target.value) || 0 })}
  className="h-8 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
  min={0}
/>
```

The Tailwind arbitrary selectors `[appearance:textfield]`, `[&::-webkit-outer-spin-button]:appearance-none`, and `[&::-webkit-inner-spin-button]:appearance-none` hide the native browser spinner arrows in Chrome/Safari/Firefox while keeping `type="number"` validation.

### 3. Amount cell (around line ~365 in body)
If the Amount body cell currently has `text-right`, change it to default (left) for consistency with the new left-aligned header. Will verify and adjust during implementation.

### 4. Extra & Proposal body cells
Remove `text-center` from the `<TableCell>` wrappers for Proposal (line 332) and Extra so the icons/checkboxes sit left under their now-left-aligned headers.

## Result
- **Qty** column is roughly half its previous width, freeing horizontal space.
- All headers (`Cost Code`, `Description`, `Qty`, `Unit Cost`, `Proposal`, `Amount`, `Extra`) render left-aligned.
- All body cells align left under their headers.
- Native up/down spinner arrows on Qty and Unit Cost are gone — clean text-style number entry.
- Description column naturally expands to absorb the previously empty space to the right of Proposal.

## Files Modified
- `src/components/bidding/ConfirmPODialog.tsx` (header widths/alignment + input className tweaks)
