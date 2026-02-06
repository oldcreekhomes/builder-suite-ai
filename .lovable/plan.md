
# Fix: Sanitize Filenames Before Supabase Storage Upload

## Problem

When uploading invoices with special characters in the filename (like `INV0021[1].pdf`), the upload fails with error:
```
Invalid key: pending/.../ea5554ea-3767-4aaf-802f-2c253c1ab57a-INV0021[1].pdf
```

This happens because browsers often add `[1]`, `[2]`, etc. to duplicate downloaded files, and Supabase Storage does not allow square brackets or other special characters in file paths.

## Root Cause

In `SimplifiedAIBillExtraction.tsx` line 189, the file path uses the raw filename without sanitization:

```tsx
const filePath = `pending/${user.id}/${crypto.randomUUID()}-${file.name}`;
```

## Solution

Apply the same filename sanitization pattern already used elsewhere in the codebase (e.g., `BillAttachmentUpload.tsx`, `WriteChecksContent.tsx`, `EditBillDialog.tsx`):

```tsx
const sanitizedName = file.name
  .replace(/\s+/g, '_')           // Replace spaces with underscores
  .replace(/[^\w.-]/g, '_')       // Replace special chars (including [ ]) with underscores
  .replace(/_+/g, '_');           // Collapse multiple underscores

const filePath = `pending/${user.id}/${crypto.randomUUID()}-${sanitizedName}`;
```

This converts `INV0021[1].pdf` to `INV0021_1_.pdf`, which Supabase Storage accepts.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/bills/SimplifiedAIBillExtraction.tsx` | Add filename sanitization before building the storage path (around line 189) |

## Why This is Safe

- The original filename is preserved in the `file_name` field in the database (line 228)
- Only the storage path uses the sanitized name
- This matches the existing pattern in 5+ other upload locations in the codebase
