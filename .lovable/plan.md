### Problem
In the Create Purchase Order dialog, typing in a line item's **Description** field (e.g. trying to put "5. " in front of "Subsequent Bath Fee") types one character then the cursor jumps to the end of the string. You requested earlier that imported descriptions be capitalized, but after the ML/bid import the user must be able to freely edit.

### Root Cause
`src/components/CreatePurchaseOrderDialog.tsx` lines 576 and 586 run `titleCase()` inside `onChange` on **every keystroke**:
```tsx
onChange={(e) => updateLine(idx, { description: titleCase(e.target.value) })}
```
Re-formatting the value on each keypress causes React to write back a transformed string, which destroys the native caret position — so the cursor snaps to the end after each character.

### Fix
Apply `titleCase` **only at import time** (already done on lines 126, 149, 159 when seeding from `bidContext.initialLineItems`) and stop transforming on every keystroke. The "best guess" capitalization from the ML/bid import is preserved on load, and subsequent user edits are stored verbatim with normal cursor behavior.

**Change both Description `onChange` handlers (lines 576 & 586) from:**
```tsx
onChange={(e) => updateLine(idx, { description: titleCase(e.target.value) })}
```
**to:**
```tsx
onChange={(e) => updateLine(idx, { description: e.target.value })}
```

No other behavior changes — the imported defaults are still title-cased; the user just regains free editing.

### Files
- `src/components/CreatePurchaseOrderDialog.tsx` — remove `titleCase()` wrapping inside the two Description `onChange` handlers.