

## Goal

Consolidate the two-row footer in ManualBillEntry into a single-row footer that matches the JournalEntryForm layout. This saves vertical space to accommodate the new PO selection panel.

---

## Current Structure (ManualBillEntry)

```text
+-----------------------------------------------+
| Job Cost Total:              $0.00            |  <-- Row 1: inside table border-t
+-----------------------------------------------+

+-----------------------------------------------+
| Total: $0.00   [Clear][Save & New]...         |  <-- Row 2: separate footer
+-----------------------------------------------+
```

Two separate footers take up unnecessary vertical space.

---

## Target Structure (matches JournalEntryForm)

```text
+-----------------------------------------------+
| Job Cost Total: $0.00    [Clear][Save & New]...|  <-- Single row
+-----------------------------------------------+
```

All information consolidated into one row, saving an entire line of vertical space.

---

## Implementation

### File: `src/components/bills/ManualBillEntry.tsx`

#### 1. Remove the standalone "Total" footer (lines 950-990)
Delete the entire second footer container that has "Total: $X" and the buttons.

#### 2. Update the Job Cost tab footer (lines 803-833)
Transform the existing "Job Cost Total" row to include the buttons:
- Keep the total display on the left
- Add the button group (Clear, Save & New, Save & Close, Save Entry) on the right
- Use `flex justify-between items-center` layout

#### 3. Update the Expense tab footer (lines 919-944)
Same treatment - add buttons to the existing total row.

#### 4. Adjust styling
- Change from `p-3 bg-muted border-t` to `p-3 bg-muted border rounded-lg mt-4` (to match the detached style of JournalEntryForm)
- Move this footer **outside** the table `border rounded-lg overflow-hidden` container so it stands alone

---

## Technical Details

### New footer structure:
```jsx
<div className="p-3 bg-muted border rounded-lg">
  <div className="flex justify-between items-center">
    <div className="text-base font-semibold">
      Job Cost Total: ${total.toFixed(2)}
    </div>
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleClear}>Clear</Button>
      <Button variant="outline" onClick={() => handleSave('new')}>Save & New</Button>
      <Button onClick={() => handleSave('close')}>Save & Close</Button>
      <Button onClick={() => handleSave('stay')}>Save Entry</Button>
    </div>
  </div>
</div>
```

### Key changes:
1. Move footer outside the table container (so it's not inside `overflow-hidden`)
2. Combine total + buttons into single flex row
3. Remove the redundant second "Total" footer entirely
4. Apply to both Job Cost and Expense tabs

---

## Expected Result

Before:
```text
[Table with rows]
Job Cost Total: $0.00          <- inside table
---------------------------------
Total: $0.00    [Clear] [Save...]   <- separate footer
```

After:
```text
[Table with rows]
---------------------------------
Job Cost Total: $0.00    [Clear] [Save...]   <- single consolidated footer
```

This saves approximately 60px of vertical space, giving room for the PO selection panel.

---

## Files to modify

- `src/components/bills/ManualBillEntry.tsx`

