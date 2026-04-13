

## Fix Auto-Renew Toggle to Use Green Background (Matching "Paid" Badge)

### Problem
The toggle is currently styled with `!bg-muted` (gray). You want it to match the exact green from the "Paid" badge (`bg-green-100`).

The previous attempts to use `bg-green-100` failed because the base Switch component has `border-2 border-transparent` and `bg-input` for unchecked state, creating visual conflicts. The fix needs to forcefully override ALL relevant properties.

### Solution
In `src/components/settings/ManageSubscriptionDialog.tsx` (line 552), replace the current className:

**From:**
```
data-[state=checked]:!bg-muted data-[state=unchecked]:!bg-muted !border-muted
```

**To:**
```
data-[state=checked]:!bg-green-100 data-[state=unchecked]:!bg-input !border-transparent
```

This ensures:
- **Checked (on)**: exact same `bg-green-100` as the "Paid" badge
- **Unchecked (off)**: standard input gray
- **Border**: transparent so no second color bleeds through
- **White thumb**: unchanged (handled by the base Switch component)

### File modified
- `src/components/settings/ManageSubscriptionDialog.tsx` — one line change on line 552

