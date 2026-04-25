## Reduce White Space Between Amount and Proposal

**File:** `src/components/bidding/ConfirmPODialog.tsx`

### Root Cause
The Description column has no fixed width (it already flexes), so the gap is not from Description being too small. The visual whitespace between "Amount" and "Proposal" is **inside** the Amount column itself — `w-[110px]` is wider than its left-aligned content (`$1,000.00`), so the unused space appears between the value and the next column's content.

### Change
Tighten the fixed-width numeric columns. Description will automatically absorb the freed width.

Line 280:
```tsx
<TableHead className="w-[90px]">Amount</TableHead>
```

Also tighten Unit Cost slightly for visual balance (line 279):
```tsx
<TableHead className="w-[90px]">Unit Cost</TableHead>
```

### Result
- ~40px reclaimed and given to Description (the flex column).
- Amount value sits closer to the Proposal icon — no more large empty gap.
- No alignment, ordering, or behavior changes.
