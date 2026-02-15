

## Fix Suppliers Sidebar: Indentation and Highlighting

### Problem 1: Indentation on page load
The `Collapsible` component sits inside the `TabsList` which has `flex flex-col`. On initial render, the Collapsible's internal layout interacts with the flex container differently than a simple `TabsTrigger`, causing it to appear indented. Once clicked, Radix recalculates and it snaps into place.

**Fix**: Add `w-full` to the `Collapsible` wrapper so it fills the flex container width consistently from the start, matching the behavior of the `TabsTrigger` elements.

### Problem 2: Highlighting when clicked
The `CollapsibleTrigger` (a `<button>`) receives default browser focus styles and Radix `data-state="open"` styling, which causes it to appear highlighted after clicking.

**Fix**: Add focus-visible outline suppression and ensure no background is applied on the open state. Update the className to include `focus-visible:outline-none focus-visible:ring-0` and use `data-[state=open]:bg-transparent` to prevent the highlighted appearance.

### Changes

**File: `src/pages/Settings.tsx`**

Line 173 -- Add `className="w-full"` to the `Collapsible` component:
```tsx
<Collapsible open={suppliersOpen} onOpenChange={setSuppliersOpen} className="w-full">
```

Line 174 -- Update `CollapsibleTrigger` className to prevent highlight:
```tsx
<CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-0 data-[state=open]:bg-transparent">
```

These two small changes ensure:
- "Suppliers" aligns flush left on page load (no indentation)
- Clicking "Suppliers" opens/closes the dropdown without leaving it highlighted

