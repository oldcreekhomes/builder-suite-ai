

## Fix Specifications Formatting in Send Bid Package Modal

### Problem
The specifications in the Send Bid Package modal render as a single flat line, despite the HTML containing proper list/indent markup from the rich text editor. The `text-xs` class overrides prose typography, and `max-h-32` makes the box too small to see formatting.

### Change

**File: `src/components/bidding/SendBidPackageModal.tsx` (line 372)**

Update the specifications container class from:
```
bg-muted p-3 rounded-lg max-h-32 overflow-y-auto text-xs prose prose-sm max-w-none
```
To:
```
bg-muted p-3 rounded-lg max-h-48 overflow-y-auto text-sm prose prose-sm max-w-none [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-6 [&_ul]:pl-6 [&_li]:my-0.5
```

- Remove `text-xs` (conflicts with prose sizing)
- Increase `max-h-32` → `max-h-48` for more visible content
- Add explicit list styling overrides to ensure numbered/bulleted lists render with proper indentation

### Result
Specifications will display with the same numbered list formatting, indentation, and line breaks as the Edit Specifications modal.

