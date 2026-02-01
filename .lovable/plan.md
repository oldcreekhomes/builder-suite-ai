
## Goal

Three UI improvements for ManualBillEntry:

1. **Always show Purchase Order dropdown** - Display it in every row with "No Purchase Order" as the default option (instead of hiding it when vendor has no POs)
2. **Fix Job Cost tab column widths** - Expand Cost Code and Memo columns to fill the full width (no white space on the right)
3. **Make Expense tab match Job Cost tab** - Same layout, same columns, including the Purchase Order column

---

## Problem Analysis

### Issue 1: Conditional PO Dropdown
In `POSelectionDropdown.tsx` lines 37-40:
```tsx
if (!purchaseOrders || purchaseOrders.length < 2) {
  return null;  // <-- Hides the dropdown entirely
}
```

The component also requires 2+ POs to show. User wants:
- Always show the dropdown
- First option: "No Purchase Order" 
- If vendor has POs: also show "Auto-match by cost code" and the PO list
- If vendor has no POs: just show "No Purchase Order"

### Issue 2: Job Cost Column Widths
Current layout (lines 677-691):
```
Cost Code: col-span-4
Memo: col-span-5 or 7
Quantity: col-span-2
Cost: col-span-2
Total: col-span-2
Address: col-span-4 (conditional)
PO: col-span-4 (conditional)
Action: col-span-1
```

The grid uses 20-28 columns dynamically, but the widths don't expand to fill available space.

### Issue 3: Expense Tab Mismatch
Current Expense tab (lines 857-864) uses completely different structure:
- Uses `grid-cols-10` (fixed)
- Has: Account, Memo, Quantity, Cost, Total, Action
- **Missing**: Address column, Purchase Order column
- Different proportions

---

## Solution

### A) POSelectionDropdown - Always Visible

**Changes:**
1. Remove the early return that hides the component
2. Add "No Purchase Order" as the first (default) option with value `__none__`
3. Only show "Auto-match by cost code" when vendor has 2+ POs
4. Always render the Select, but conditionally show PO options
5. Update `useShouldShowPOSelection` hook to always return true (or remove it)

**New dropdown behavior:**
- No POs: Shows "No Purchase Order" (selected by default)
- 1 PO: Shows "No Purchase Order", "Auto-match by cost code", and the single PO
- 2+ POs: Shows "No Purchase Order", "Auto-match by cost code", and all POs

### B) Job Cost Tab - Full Width Grid

**Changes to header and rows:**
1. Use a consistent column structure that fills the entire width
2. Increase Cost Code from col-span-4 to col-span-5
3. Increase Memo to use remaining space (col-span-6 or flexible)
4. Always include PO column (now that it's always visible)
5. Adjust grid-cols total to ensure full width coverage

**Proposed column allocation (always 24 cols, no dynamic switching):**
```
Cost Code: col-span-5
Memo: col-span-6
Quantity: col-span-2
Cost: col-span-2
Total: col-span-2
Address: col-span-3 (when applicable)
Purchase Order: col-span-3
Action: col-span-1
Total = 24 columns
```

For cases without address column:
```
Cost Code: col-span-5
Memo: col-span-8  (absorbs address space)
Quantity: col-span-2
Cost: col-span-2
Total: col-span-2
Purchase Order: col-span-4
Action: col-span-1
Total = 24 columns
```

### C) Expense Tab - Match Job Cost

**Transform the Expense grid to mirror Job Cost:**
1. Change from `grid-cols-10` to `grid-cols-24`
2. Add Address column (conditional, same as Job Cost)
3. Add Purchase Order column (always visible)
4. Use same column proportions as Job Cost

**Proposed Expense columns:**
```
Account: col-span-5 (same as Cost Code)
Memo: col-span-8 or 6 (matches Job Cost)
Quantity: col-span-2
Cost: col-span-2
Total: col-span-2
Address: col-span-3 (conditional)
Purchase Order: col-span-4 or 3
Action: col-span-1
```

---

## Technical Implementation

### File 1: `src/components/bills/POSelectionDropdown.tsx`

1. Remove the early `return null` check (lines 37-40)
2. Add `__none__` value as "No Purchase Order" option
3. Conditionally render "Auto-match by cost code" only when 2+ POs exist
4. Always render the dropdown with at least "No Purchase Order"
5. Update `handleChange` to handle `__none__` value
6. Update `useShouldShowPOSelection` to return `true` always (or remove entirely)

### File 2: `src/components/bills/ManualBillEntry.tsx`

**Job Cost tab (lines 676-792):**
1. Remove conditional `showPOSelection` logic from grid-cols calculation
2. Use fixed `grid-cols-24` (or `grid-cols-21` without address)
3. Adjust column spans:
   - Cost Code: 5
   - Memo: 6 (with PO) or 8 (with both address+PO)
   - Quantity: 2
   - Cost: 2
   - Total: 2
   - Address: 3 (conditional)
   - PO: 4 (always)
   - Action: 1
4. Always render POSelectionDropdown (remove the `showPOSelection &&` condition)

**Expense tab (lines 856-930):**
1. Change from `grid-cols-10` to match Job Cost structure (`grid-cols-24`)
2. Add Address column (conditional)
3. Add POSelectionDropdown column (always)
4. Update column spans to match Job Cost proportions

---

## Summary of Changes

| File | Changes |
|------|---------|
| `POSelectionDropdown.tsx` | Remove conditional hiding, add "No Purchase Order" option, show auto-match only when 2+ POs |
| `ManualBillEntry.tsx` | Fix Job Cost widths (expand Cost Code + Memo), add PO column to Expense tab, align both tabs |

---

## Expected Result

1. Purchase Order dropdown always visible in both tabs
2. Default option "No Purchase Order" when no POs exist
3. Job Cost columns fill the full width (no right-side white space)
4. Expense tab layout matches Job Cost exactly
5. Consistent user experience across both tabs
