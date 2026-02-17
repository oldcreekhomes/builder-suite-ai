

## Bid Package Details Modal Cleanup

Three changes to the bid package detail view:

### 1. Slider: Increase Range and Default
- **DistanceFilterBar.tsx**: Change `max={50}` to `max={75}`, update "50 mi" label to "75 mi"
- **BidPackageDetailsModal.tsx**: Change default `distanceRadius` from `25` to `50`

### 2. Remove "Access MarketPlace" Card
- **DistanceFilterBar.tsx**: Delete the entire MarketPlace box (lines 71-92), remove `Store` and `HelpCircle` imports, remove the `flex gap-4` wrapper since only one box remains, and remove unused `Tooltip`/`TooltipProvider`/`TooltipContent`/`TooltipTrigger` imports if no longer needed

### 3. Standardize Tables to shadcn Defaults

**Top table (bid package info) -- BidPackageDetailsModal.tsx:**
- Change the Actions `<th>` from `text-left` to `text-center` (line 222) so the 3-dot button aligns with the centered header

**Bottom table (companies) -- BiddingCompanyRow.tsx:**
- Replace the separate "Send Email" button, "Delete" button, and "Send PO" button with a single `TableRowActions` 3-dot dropdown containing:
  - "Send Email" (calls `onSendEmail`)
  - "Send PO" (opens the ConfirmPODialog)
  - Separator
  - "Delete" (destructive, with confirmation)
- Remove the separate "Status" column entirely -- the "Send PO" action moves into the dropdown
- Center the Actions cell with `text-center`

**BiddingCompanyList.tsx (header row):**
- Remove the "Status" column header (line 158)
- Change "Actions" header to `text-center`
- Remove `font-bold` from headers (use default `font-medium` per shadcn standard)
- Remove `py-2` overrides (use default `p-2`)
- Remove `pl-8` from Company header
- Remove `w-12` from checkbox cell

### Files Changed
1. `src/components/bidding/components/DistanceFilterBar.tsx` -- slider max, remove MarketPlace
2. `src/components/bidding/BidPackageDetailsModal.tsx` -- default radius, center Actions header
3. `src/components/bidding/components/BiddingCompanyRow.tsx` -- consolidate actions into 3-dot dropdown
4. `src/components/bidding/BiddingCompanyList.tsx` -- remove Status column, standardize header

