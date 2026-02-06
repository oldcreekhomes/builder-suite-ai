

# Fix: PDF.js Version Mismatch Causing Upload Failures

## The Problem

When you try to upload a PDF on the Estimate page, you see "Failed to upload sheets" because there's a version mismatch between the PDF.js API and Worker:

```
The API version "5.4.530" does not match the Worker version "5.4.296"
```

**What's happening:**
- `react-pdf` library includes its own `pdfjs-dist@5.4.296`
- Your project also has a separate `pdfjs-dist@^5.3.93` which resolved to `5.4.530`
- The upload dialog imports from the standalone `pdfjs-dist` (v5.4.530)
- But the worker is configured using `react-pdf`'s version (v5.4.296)

This mismatch causes the PDF parsing to fail completely.

## The Solution

Modify `UploadSheetDialog.tsx` to import `pdfjs` from the centralized config (which uses `react-pdf`'s version) instead of importing directly from `pdfjs-dist`.

## Files to Change

**File:** `src/components/estimate/UploadSheetDialog.tsx`

### Change 1: Update the import (line 17)

Replace:
```typescript
import * as pdfjsLib from "pdfjs-dist";
```

With:
```typescript
import { pdfjs } from "@/lib/pdfConfig";
```

### Change 2: Update usage (line 107)

Replace:
```typescript
const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
```

With:
```typescript
const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
```

## Why This Works

The `pdfConfig.ts` file:
1. Gets `pdfjs` from `react-pdf` (which uses version 5.4.296)
2. Configures the worker to match that exact version
3. Exports the `pdfjs` object for use throughout the app

By using this centralized config, all PDF operations use the same version, eliminating the mismatch.

## Alternative Approach (Not Recommended)

We could also fix this by pinning `pdfjs-dist` in package.json to exactly `5.4.296` to match react-pdf, but this is fragile because:
- It would break again if react-pdf updates
- It requires manual version tracking
- The centralized import approach is cleaner and self-maintaining

## Technical Details

| Component | Current Version | After Fix |
|-----------|-----------------|-----------|
| UploadSheetDialog import | pdfjs-dist 5.4.530 | react-pdf's pdfjs 5.4.296 |
| Worker version | 5.4.296 | 5.4.296 |
| **Result** | Mismatch Error | Matching versions |

