

## Fix: Allow Quantity Field to Be Cleared in Make Deposits

### Problem
In the "Make Deposits" form, the quantity input uses `value={row.quantity || "1"}` (line 1003 of `MakeDepositsContent.tsx`). The `|| "1"` fallback means that when you delete the "1", the empty string is falsy, so it immediately snaps back to "1". You can never clear the field to type a new value like "0.5".

The same pattern exists in the revenue rows section of the same file (need to check exact line).

### Fix
In `src/components/transactions/MakeDepositsContent.tsx`:

1. **Change the `value` binding** from `row.quantity || "1"` to just `row.quantity ?? ""` — this allows the field to be empty while typing
2. **Apply the same fix** to both the "other" rows and the "revenue" rows quantity inputs
3. The `placeholder="1"` already exists, so users will still see "1" as a hint when the field is empty
4. The calculation logic already handles empty/zero gracefully via `parseFloat(row.quantity || "0") || 0`

### Files changed
- `src/components/transactions/MakeDepositsContent.tsx` — change quantity input `value` prop in both row renderers

