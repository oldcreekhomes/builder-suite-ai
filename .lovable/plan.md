## Problem

In Write Checks, the Quantity input on each row won't let you delete past `1`. Pressing Backspace appears to do nothing — the field snaps back to `1`.

## Cause

In `src/components/transactions/WriteChecksContent.tsx`, both Quantity inputs render with:

```tsx
value={row.quantity || "1"}
```

When the user clears the field, `row.quantity` becomes `""`, and the `|| "1"` fallback immediately re-displays `"1"`. The state update is correct; the display is overriding it.

## Fix (UI only, no business logic changes)

Two one-line edits in `src/components/transactions/WriteChecksContent.tsx`:

1. Line 1311 (Chart of Accounts / Expense rows Quantity input): change
   `value={row.quantity || "1"}` → `value={row.quantity ?? ""}`
2. Line 1438 (Job Cost rows Quantity input): same change.

This lets the field be fully cleared while typing. All downstream math already uses `parseFloat(row.quantity || "0") || 0` / `|| "1"` as the numeric fallback at save time, so an empty string in the input does not break totals or saving.

## Out of scope

- No changes to save logic, journal entries, defaults on row creation (new rows still start at `"1"`), or any other field.
