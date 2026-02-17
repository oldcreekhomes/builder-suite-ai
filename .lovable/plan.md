

## Fix Insurance Alerts: Company Name Overflow

### Root Cause
The `Card` component itself doesn't have `overflow-hidden`, so even though child elements have `truncate`, the card's boundary isn't enforced as a clipping boundary. The grid column gives the card a width, but without `overflow-hidden` on the Card, content can visually overflow.

### Fix (single file)

**`src/components/InsuranceAlertsCard.tsx` -- Line 13**

Add `overflow-hidden` to the Card element itself:

```
Before: <Card className="h-full flex flex-col">
After:  <Card className="h-full flex flex-col overflow-hidden">
```

This is the missing piece -- the outermost container (the Card) must clip overflow for all descendant `truncate` classes to work within the card's boundaries.

### Why previous attempts failed
We kept adding `overflow-hidden` to inner containers (the row div, the list wrapper), but the Card itself -- the element that gets its width from the grid column -- was never set to clip its overflow. The inner elements inherit their available width from the Card, so the Card is where the constraint must be enforced.
