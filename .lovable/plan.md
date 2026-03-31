

## Make Send Bid Package Modal More Compact

### Changes — `src/components/bidding/SendBidPackageModal.tsx`

**1. Move sent status inline with company name**

Instead of a separate line for "Not yet sent" / "Already sent on...", place it as a badge/tag to the right of the company name in the same row. This saves a full line per company card.

```
[✓] 🏢 LCS Site Services          Not yet sent
    👥 Ron Patrick  Doug Scott  Kevin Birrell
```

**2. Put recipients inline with the "Recipients:" label**

Instead of "Recipients:" on its own line with names below, combine them into one row:

```
    👥 Recipients: Ron Patrick  Doug Scott  Kevin Birrell
```

This removes the `space-y-1` wrapper and the separate `flex items-center` div for the label, putting everything in a single flex-wrap row.

**3. Reduce card padding and spacing**

- Card padding from `p-3` to `p-2`
- Grid gap from `gap-3` to `gap-2`
- Remove `space-y-1` inside cards since rows are consolidated

### Summary of layout per card (before → after)

Before (4 lines):
```
[✓] 🏢 Company Name
    Not yet sent
    👥 Recipients:
    Name1  Name2  Name3
```

After (2 lines):
```
[✓] 🏢 Company Name              Not yet sent
    👥 Recipients: Name1  Name2  Name3
```

### Files Changed
- `src/components/bidding/SendBidPackageModal.tsx` — restructure company cards for compactness

