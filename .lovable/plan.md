

## Bid Package Details Modal Cleanup

### 1. Remove Duplicate Trash Can in Proposals Column
The `ProposalCell` component (lines 82-93) renders a standalone red trash can icon (via `DeleteButton`) to the right of proposal files for "Delete All Proposals." This is redundant since each file already has its own delete "x" badge, and "Remove Company" (which removes all proposals with the company) is already in the 3-dot Actions menu. Remove the `DeleteButton` from `ProposalCell.tsx`.

**File: `src/components/bidding/components/ProposalCell.tsx`**
- Remove the `DeleteButton` block (lines 82-93) that renders the standalone trash icon
- Remove the `DeleteButton` import
- Simplify the wrapper div since we no longer need `justify-between`

### 2. Move Distance Slider Into the Top Table Row
Instead of a separate card between the two tables, add a "Distance" column to the top bid package table. The slider will be compact inside a table cell, right after the "Files" column.

**File: `src/components/bidding/BidPackageDetailsModal.tsx`**
- Add a `<th>` for "Distance" between "Files" and "Actions" in the header row (line 221)
- Add a `<td>` containing a compact inline slider with the label "X mi from job site" and the "Showing X of Y" count
- Remove the standalone `<DistanceFilterBar>` section (lines 298-306)
- Remove the `DistanceFilterBar` import

**File: `src/components/bidding/components/DistanceFilterBar.tsx`**
- This file can be deleted since the slider will be inline in the table cell. Alternatively, we can create a compact inline version. Given simplicity, we will inline the slider directly in the modal.

### 3. Update Label to Say "from job site"
The slider label will read: **"50 mi from job site"** instead of just "Distance: 50 miles." The count text will say: "Showing 3 of 8 within 50 mi."

### 4. Standardize Both Tables to Match shadcn/ui Defaults
The top table currently uses raw HTML `<table>`, `<thead>`, `<tr>`, `<th>`, `<td>` with custom `p-3` styling and dark black headers. The bottom table uses shadcn `TableRow`/`TableCell` with muted-foreground headers. They need to match.

**File: `src/components/bidding/BidPackageDetailsModal.tsx`**
- Convert the top table from raw HTML (`<table>`, `<thead>`, `<tr>`, `<th>`, `<td>`) to shadcn components (`Table`, `TableHeader`, `TableHead`, `TableRow`, `TableBody`, `TableCell`)
- Remove `p-3 text-sm font-medium` from `<th>` elements -- shadcn `TableHead` already provides the correct muted-foreground styling with `h-10`, `px-2`, `font-medium`, `text-muted-foreground`
- Remove `p-3` from `<td>` elements -- shadcn `TableCell` provides default `p-2`
- Both tables will now use the same shadcn component set with identical header styling (muted gray, not black)

### Summary of Files Changed
1. **`src/components/bidding/components/ProposalCell.tsx`** -- Remove duplicate trash can
2. **`src/components/bidding/BidPackageDetailsModal.tsx`** -- Move slider into top table as "Distance" column, convert top table to shadcn components, remove standalone DistanceFilterBar
3. **`src/components/bidding/components/DistanceFilterBar.tsx`** -- Delete file (no longer needed)

