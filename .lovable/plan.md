

## Fix Address Shortening (for real this time)

### Root Cause

The database stores addresses like `895 Kentucky Street Arlington, VA 22205`. The current `formatAddress` splits on comma, yielding `895 Kentucky Street Arlington` — which strips the state/ZIP but **keeps the city name** because it sits before the comma.

### The Fix

In `src/hooks/useHistoricalProjects.ts`, after abbreviating street suffixes, detect and remove trailing city words. The approach:

1. Split on comma → `"895 Kentucky Street Arlington"`
2. Clean directional periods → `"895 Kentucky Street Arlington"`
3. Abbreviate suffixes → `"895 Kentucky St Arlington"`
4. **New step**: Find the last street suffix in the string and truncate everything after it. If no suffix is found, keep as-is.

This handles all real data patterns:
- `895 Kentucky Street Arlington, VA 22205` → `895 Kentucky St`
- `1712 N. Quebec St. Arlington, VA 22207` → `1712 N Quebec St`
- `415 E Nelson, Alexandria, Virginia, 22314` → `415 E Nelson` (no suffix, comma already handles it)
- `5617 23rd Street, Arlington, VA 22205` → `5617 23rd St` (comma already handles it)

### File changed
- `src/hooks/useHistoricalProjects.ts` — add post-suffix truncation step to `formatAddress`

