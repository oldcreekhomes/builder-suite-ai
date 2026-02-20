

## Remove Secondary "No specific line" Dropdown from PO Selection

### Problem

When a Purchase Order with multiple line items is selected, a second smaller dropdown ("No specific line") appears below the main PO dropdown. This is confusing and unnecessary. The user only needs the single PO dropdown with the ability to choose "No purchase order."

### What Will Change

Remove the secondary line-item dropdown from the `POSelectionDropdown` component entirely. Only the main PO selection dropdown will remain.

### Technical Details

**File: `src/components/bills/POSelectionDropdown.tsx`**

1. Remove the `showLineDropdown` variable and the entire secondary `<Select>` block (the one that renders line items with "No specific line" as default).
2. Remove the `handleLineChange` function since it's no longer needed.
3. Keep the existing logic in `handleChange` that auto-assigns a line when a PO has exactly one line item or when a cost code match is found -- this silent auto-assignment is fine and doesn't involve a visible dropdown.

No other files need to change.

