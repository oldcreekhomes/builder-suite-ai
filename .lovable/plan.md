## Problem

In `EditExtractedBillDialog.tsx`, the Description field is bound to `line.memo`. When saving, only `memo` is written to the `pending_bill_lines` row — the row's original `description` column (from the AI extraction, e.g. "V20 20-volt 200-CFM 90-MPH") is left untouched.

On reopen, the dialog initializes each line with:

```
memo: line.description || line.memo || ""
```

Because `description` still holds the original extracted text, it wins and the user's saved edit ("sdfsd") is hidden. The dashboard hover tooltip reads `memo` directly, which is why that one shows the correct edited value.

## Fix

In `src/components/bills/EditExtractedBillDialog.tsx`, flip the precedence so the user's saved `memo` wins over the original extracted `description` when loading the dialog. Apply to all three places (job_cost, expense-as-job_cost, expense) around lines 298–327:

```
memo: line.memo || line.description || "",
matchingText: line.memo || line.description || "",
```

This way:
- First load (fresh extraction): `memo` is empty, falls back to `description` — same as today.
- After user edits and saves: `memo` is populated and is used on reopen.

No DB schema change, no save-path change, no other component changes.
