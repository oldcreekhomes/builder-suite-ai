

## Shrink Historical Dropdown to Match Adjacent Buttons

### Problem
The Historical dropdown trigger is set to a fixed `w-48` (192px) which is too wide. It needs to match the compact `h-9 size="sm"` styling of the adjacent "Global Settings" and "Load Bid Packages" buttons.

### Changes

**File: `src/components/bidding/BiddingTable.tsx`** (line 222)

Change the SelectTrigger class from `h-9 w-48` to `h-9 w-auto` so it auto-sizes to content rather than being a fixed 192px width. This matches how the other buttons naturally size to their content.

```tsx
// Before
<SelectTrigger className="h-9 w-48">

// After
<SelectTrigger className="h-9 w-auto">
```

Single line change. The addresses are already street-only (the hook strips city/state at line 25), so the only fix needed is removing the fixed width.

