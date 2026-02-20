

## Fix: Allow "No Purchase Order" Selection to Stick

### Problem

When you select "No purchase order" from the PO dropdown, it immediately reverts back to "Auto-match by cost code." This happens because selecting "No purchase order" sets the value to `undefined`, which is indistinguishable from "hasn't been chosen yet," causing the dropdown to default back to auto-match.

### Solution

Update the `POSelectionDropdown` component so that selecting "No purchase order" stores the sentinel value `"__none__"` instead of `undefined`. This way the dropdown knows the user explicitly chose "no PO" and won't snap back to auto-match.

### Technical Details

**File: `src/components/bills/POSelectionDropdown.tsx`**

1. **Line 93-97 (handleChange)**: When `__none__` is selected, call `onChange('__none__', undefined)` instead of `onChange(undefined, undefined)`. Same for `__auto__`.

2. **Line 136 (selectValue)**: Change the fallback logic so it only defaults to `__auto__` when the value is truly unset (undefined/null), not when it's the `__none__` sentinel.

3. **Parent components** (`EditExtractedBillDialog`, `ManualBillEntry`, `EditBillDialog`): Update the save/submit logic so that when the PO value is `"__none__"` or `"__auto__"`, it saves `null` to the database instead of the sentinel string. This ensures database integrity while the UI correctly reflects the user's choice.

