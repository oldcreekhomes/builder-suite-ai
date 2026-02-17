

## Fix Insurance Alerts: Company Name Truncation

### Problem
The `truncate` CSS class on the company name requires its parent flex container to also prevent overflow. Currently the alert row div (line 53) doesn't have `overflow-hidden`, so the text can still expand beyond the card boundary.

### Fix (single file: `src/components/InsuranceAlertsCard.tsx`)

Add `overflow-hidden` to the flex row container so the child `truncate` class works correctly:

```
Line 53: "flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50"
      -> "flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 overflow-hidden"
```

This ensures the row itself is bounded by the card width, which allows `truncate` on the company name `<p>` to properly clip with an ellipsis. The `title` attribute already added will let users hover to see the full name.

### Files Changed
- `src/components/InsuranceAlertsCard.tsx` -- add `overflow-hidden` to alert row div

