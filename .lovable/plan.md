## Goal
Make large PDF previews open quickly with one clear viewer experience: no duplicate preview modals/viewers, no stacked spinners, and no quality/compression loss.

## What I found
- The app currently wraps the file manager in `UniversalFilePreviewProvider` twice: once in `ProjectFiles.tsx` and again inside `SimpleFileManager.tsx`. That can create two separate preview modal/viewer systems on the same page.
- The PDF viewer still shows multiple loading states: the outer file preview loading state plus PDF.js document/page loading states.
- The previous PDF “linearization” edge function is not true PDF fast-web-view linearization. `pdf-lib` with `useObjectStreams: false` rewrites the file losslessly, but it does not create the linearized hint tables required for instant first-page streaming on large PDFs.
- Uploads are not yet connected to any reliable PDF optimization path, so new large PDFs can still behave slowly.

## Plan
1. **Remove the duplicate preview provider**
   - Keep only one `UniversalFilePreviewProvider` for the Project Files page.
   - Remove the nested provider inside `SimpleFileManager` so one click can only open one preview modal/viewer.

2. **Simplify PDF loading UI to one spinner**
   - For PDFs, avoid showing the outer “Loading preview...” spinner once the signed URL is being fetched.
   - Let the single PDF viewer own the loading state.
   - Remove per-page spinner text that makes it look like another viewer is loading.

3. **Replace the false linearization approach with real fast-web-view linearization**
   - Update the `linearize-pdf` edge function to use a real `qpdf --linearize` command when available.
   - Keep the process lossless: no image compression, no downsampling, no resolution changes.
   - If `qpdf` is not available in the Supabase Edge runtime, the function should return a clear error instead of pretending the PDF is optimized.

4. **Connect PDF optimization after upload**
   - After a PDF upload/database insert succeeds, call the edge function in the background for that file.
   - Upload completion remains fast; optimization happens afterward.
   - Mark `is_linearized` only when true linearization succeeds.

5. **Backfill existing PDFs properly**
   - Re-run the backfill with the real linearizer for existing project PDFs, including the 413 East Nelson grading plan.
   - Do not compress files; only restructure them for fast preview streaming.

6. **Validate with the actual problem file**
   - Confirm only one preview modal/viewer appears.
   - Confirm the first page starts rendering quickly.
   - Confirm network requests use byte-range loading rather than waiting on the full 23–25MB file.

## Technical details
- Files likely changed:
  - `src/pages/ProjectFiles.tsx`
  - `src/components/files/SimpleFileManager.tsx`
  - `src/components/files/FilePreviewContent.tsx`
  - `src/components/files/PDFViewer.tsx`
  - `supabase/functions/linearize-pdf/index.ts`
- The fix must not use blob downloads for preview, because blob downloads require the full file before rendering.
- The fix must not use compression or quality reduction.