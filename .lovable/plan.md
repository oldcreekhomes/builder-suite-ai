

# Remove Dropdown Arrow from "Add Files" Button

## Summary
Remove the chevron/dropdown arrow icon from the "Add Files" button while keeping the dropdown menu functionality intact. The button will still open the dropdown when clicked, but without the visual arrow indicator.

## Changes

### File: `src/components/bidding/components/BiddingTableRowFiles.tsx`

**Current code (lines 127-134)**:
```tsx
<Button
  variant="outline"
  size="sm"
  className="h-8 text-xs"
>
  Add Files
  <ChevronDown className="ml-1 h-3 w-3" />
</Button>
```

**Updated code**:
```tsx
<Button
  variant="outline"
  size="sm"
  className="h-8 text-xs"
>
  Add Files
</Button>
```

**Additional cleanup**:
- Remove the `ChevronDown` import from line 14 since it will no longer be used

## Impact
This change affects:
- Draft tab bidding table
- Bidding tab bidding table  
- Closed tab bidding table
- Bid package details modal (uses the same component)

All locations will have the arrow removed since they all use the same `BiddingTableRowFiles` component.

