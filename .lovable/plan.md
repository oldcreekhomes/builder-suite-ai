

## Fix Empty Memo Fields

### Problem

The memo column is blank for all line items. The AI extraction puts meaningful line-specific text (e.g., "Frame basement walls", "Deck balance", "Siding draw") into the `description` field of extracted bill lines, while `memo` is typically `null`.

The previous fix over-corrected by reverting to `memo: line.memo || ""`, which drops the description entirely from the UI. Before that, `memo: line.memo || line.description || ""` worked for most cases but sometimes showed the full invoice body text for single-line invoices.

### Root Cause

When the AI extracts a multi-line invoice, each line's `description` is line-specific (e.g., "Frame basement walls"). When it extracts a single-line invoice, the `description` can sometimes be the entire invoice body. The code needs to handle both cases.

### Solution

**File: `src/components/bills/EditExtractedBillDialog.tsx`**

Restore the fallback to `description` for the memo display, but with a length guard to avoid showing the full invoice body:

```
memo: line.memo || (line.description && line.description.length <= 120 ? line.description : "") || "",
```

This means:
- If `memo` exists, use it (best case)
- If `memo` is null but `description` is short (120 chars or less), it's a real line description like "Frame basement walls" -- use it as memo
- If `description` is longer than 120 chars, it's likely the full invoice body -- skip it

The `matchingText` field remains unchanged and always uses the full `description` for matching purposes.

### Changes

Three lines need updating (lines 232, 246, 257) from:
```
memo: line.memo || "",
```
to:
```
memo: line.memo || (line.description && line.description.length <= 120 ? line.description : "") || "",
```

### Expected Result

- Line items will again show descriptive memos like "Frame basement walls", "Deck balance", "Siding draw"
- Full invoice body text will NOT leak into the memo field
- PO matching logic (using `matchingText`) remains unaffected

