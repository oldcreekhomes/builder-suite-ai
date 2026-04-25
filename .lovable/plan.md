## Remove White Space Between Amount → Proposal → Extra

**File:** `src/components/bidding/ConfirmPODialog.tsx`

### Root Cause
The visual gaps come from the `Proposal` and `Extra` columns being wider than their tiny contents (an icon and a checkbox). Amount itself is now well sized, so we leave it alone and shrink the two narrow icon/checkbox columns. The unconstrained `Description` column will automatically absorb the freed width, evenly spreading the layout.

### Changes (lines 281–282)
```tsx
<TableHead className="w-[44px] text-center">Proposal</TableHead>
<TableHead className="w-[44px] text-center">Extra</TableHead>
```

- Proposal: `w-[70px]` → `w-[44px]` (icon is ~20px; 44px gives breathing room and centers it)
- Extra: `w-[60px]` → `w-[44px]` (checkbox is ~16px)
- Both centered so the icon/checkbox sit directly under their headers
- Amount (`w-[90px]`) and Actions (`w-[50px]`) untouched
- Description has no fixed width — it grows to fill the ~42px reclaimed

### Result
- No more large empty gap between Amount and Proposal, or Proposal and Extra
- Columns appear evenly spaced
- No alignment, ordering, or behavior changes
