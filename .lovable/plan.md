

## Change "Actual" Badge Color from Teal to Green

### Problem
The teal color (`bg-teal-100 text-teal-700 border-teal-200`) used for the "Actual" source badge is hard to distinguish for colorblind users.

### Fix
Update `src/components/budget/BudgetSourceBadge.tsx` — change the `'actual'` case colors from teal to green:

```ts
// From:
className: 'bg-teal-100 text-teal-700 border-teal-200'

// To:
className: 'bg-green-100 text-green-700 border-green-200'
```

This is a single-line change in one file. The green palette is already used for "Vendor Bid" badges, but the label text ("Actual" vs "Vendor Bid") keeps them distinguishable.

