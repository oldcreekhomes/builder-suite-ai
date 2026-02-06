
# Fix "Sent On" Date Color to Match Due Date and Reminder Date

## Summary
The "Sent On" date is always displaying in a muted gray color, while the Due Date and Reminder Date only use gray for the placeholder and show populated dates in the standard dark text color. We need to apply the same conditional styling.

## Changes Overview

### 1. Update BiddingTableRowContent.tsx
**File**: `src/components/bidding/components/BiddingTableRowContent.tsx`

**Current code (line 125-127)**:
```tsx
<TableCell className="py-1 w-32 text-sm text-muted-foreground">
  {item.sent_on ? format(new Date(item.sent_on), 'MM/dd/yyyy') : 'mm/dd/yyyy'}
</TableCell>
```

**Updated code**:
```tsx
<TableCell className={cn("py-1 w-32 text-sm", !item.sent_on && "text-muted-foreground")}>
  {item.sent_on ? format(new Date(item.sent_on), 'MM/dd/yyyy') : 'mm/dd/yyyy'}
</TableCell>
```

- Add import for `cn` utility from `@/lib/utils`
- Only apply `text-muted-foreground` when date is NOT set
- When date is populated, it will use the default dark text color

### 2. Update BidPackageDetailsModal.tsx
**File**: `src/components/bidding/BidPackageDetailsModal.tsx`

**Current code (line 241-243)**:
```tsx
<td className="p-3 text-sm text-muted-foreground">
  {item.sent_on ? format(new Date(item.sent_on), 'MM/dd/yyyy') : 'mm/dd/yyyy'}
</td>
```

**Updated code**:
```tsx
<td className={cn("p-3 text-sm", !item.sent_on && "text-muted-foreground")}>
  {item.sent_on ? format(new Date(item.sent_on), 'MM/dd/yyyy') : 'mm/dd/yyyy'}
</td>
```

- Add import for `cn` utility from `@/lib/utils`
- Only apply `text-muted-foreground` when date is NOT set
- When date is populated, it will use the default dark text color

## Visual Result
After these changes:
- **Populated dates**: Will display in the same dark color as Due Date and Reminder Date
- **Empty dates**: Will continue to show "mm/dd/yyyy" in the muted gray color

This applies to all three tabs (Draft, Bidding, Closed) as well as the bid package details modal dialog.

## Files to Modify
1. `src/components/bidding/components/BiddingTableRowContent.tsx`
2. `src/components/bidding/BidPackageDetailsModal.tsx`
