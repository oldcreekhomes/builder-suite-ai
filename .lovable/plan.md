

## Standardize Bidding Tables to Match shadcn/ui Defaults

### Problem
The bidding table (Draft, Bidding, Closed tabs) has inconsistent styling compared to the rest of the application's standardized shadcn/ui tables. Specifically:
- Actions column "..." button is not centered
- Multiple cells use custom `py-1` padding instead of default `p-2`
- Group header rows use custom height/padding overrides
- The `font-medium` on the Cost Code data cell should be removed (reserved for headers only)

### Changes

**1. `src/components/bidding/components/BiddingTableRowActions.tsx`**
- Change `className="py-1"` to no custom class (use default `p-2`)
- Add `text-center` to ensure the "..." button is centered

**2. `src/components/bidding/components/BiddingTableRowContent.tsx`**
- Remove `font-medium` from the Cost Code TableCell (line 88) -- data cells should use default weight
- Remove `w-12` from the checkbox TableCell (let it use default sizing)

**3. `src/components/bidding/components/BiddingTableRowSpecs.tsx`**
- Remove `py-1` from the TableCell (line 25) -- use default `p-2`

**4. `src/components/bidding/components/BiddingTableRowFiles.tsx`**
- Remove `py-1` from the TableCell (line 86) -- use default `p-2`

**5. `src/components/bidding/BiddingGroupHeader.tsx`**
- Remove `h-10` from the TableRow (line 33) -- use default row height
- Remove `py-1` from all TableCells (lines 34, 42, 54) -- use default `p-2`
- Remove custom `text-sm` from the group name cell (already default)

**6. `src/components/bidding/BiddingTableHeader.tsx`**
- Add `text-center` to the Actions TableHead (already present, confirmed)

### What stays the same
- All functionality (date pickers, file uploads, specs editing, status changes, actions dropdown)
- The 3-dot dropdown menu pattern via `TableRowActions`
- Calendar component usage
- Column order and content

### Scope
This affects all three bidding tabs (Draft, Bidding, Closed) since they all use the same `BiddingTable` component.
