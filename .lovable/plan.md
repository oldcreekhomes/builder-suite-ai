

## Fix: Make PO Status Badges Visually Consistent

### Problem
"Over Budget" is too long for the column, causing text wrapping and looking oversized compared to "Matched." The badges need to be visually equivalent in size and weight.

### Changes — `src/components/bills/POStatusBadge.tsx`

1. **Shorten label**: Change `'Over Budget'` back to `'Over'` (the tooltip already explains "Cumulative bills exceed PO amount")
2. **Add `whitespace-nowrap`** to the Badge className to prevent any wrapping
3. **Add `font-normal`** to normalize weight across all badges so "Matched" and "Over" look equivalent

Single file, lines 28 and 62-63.

