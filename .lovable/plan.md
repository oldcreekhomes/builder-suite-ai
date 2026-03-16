

## Plan: Fix "Highlighted Scope of Work" Not Appearing

### Root Cause
`DEFAULT_FIELDS.projectDrawings` is set to `exhibits.projectDrawings` (line 166), which comes from the database via `useTemplateContent`. If the DB's saved template record doesn't include "HIGHLIGHTED SCOPE OF WORK", the migration on line 183 replaces the field with the same stale value — it never actually gets the updated default from `DEFAULT_EXHIBITS`.

### Fix: `src/components/templates/SubcontractorContractForm.tsx`

**Change the migration logic (line 183-184):** Instead of replacing with `DEFAULT_FIELDS.projectDrawings` (which may be stale from DB), import `DEFAULT_EXHIBITS` from `useTemplateContent.ts` and use `DEFAULT_EXHIBITS.projectDrawings` directly as the migration target. This guarantees the hardcoded 68-entry list with "HIGHLIGHTED SCOPE OF WORK" is used.

```tsx
import { useTemplateContent, DEFAULT_EXHIBITS } from "@/hooks/useTemplateContent";

// In migration check:
if (!savedData.fields.projectDrawings || 
    !savedData.fields.projectDrawings.includes("Sheet 1: Cover Sheet") || 
    !savedData.fields.projectDrawings.includes("HIGHLIGHTED SCOPE OF WORK")) {
  mergedFields.projectDrawings = DEFAULT_EXHIBITS.projectDrawings;
}
```

This is a one-line import addition and one-line change in the migration block. No other files or logic affected.

