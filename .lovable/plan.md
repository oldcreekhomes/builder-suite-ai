## Plan

1. **Remove the tooltip wrapper from editable table inputs**
   - In `EditExtractedBillDialog.tsx`, stop wrapping the Job Cost **Description** input in Radix `Tooltip` / `TooltipTrigger`.
   - Do the same for the Job Cost **Cost Code** input if needed, because Radix tooltip triggers around focusable inputs can steal focus/re-render focus state while typing.

2. **Make row keys stable while editing**
   - Change grouped Job Cost display row keys so they do **not** include editable text like `memo`.
   - Use the underlying line ids as the React key instead, so typing in Description cannot make React unmount/remount the row after every character.

3. **Keep existing save and edit behavior unchanged**
   - Keep the same `onChange` logic and state updates.
   - Keep totals, purchase order matching, grouping, and save behavior unchanged.
   - Only change focus stability for editable cells.

## Technical details

The current row key is built from fields including `memo`:

```text
cost_code_id | unit_cost | memo | matchingText | purchase_order_id | purchase_order_line_id
```

When you type one character in Description, `memo` changes, which changes the row key. React treats that as a different row, unmounts the input, and the browser loses cursor focus. The fix is to keep display grouping logic intact but render each row with a key based on stable child line ids instead of editable memo text.