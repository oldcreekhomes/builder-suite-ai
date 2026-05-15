I found the real problem: the viewer is still downloading the whole 25MB PDF with a normal `200` request before it becomes usable, and the PDF text layer is creating thousands of DOM text spans for the construction drawing. Supabase does support byte-range loading (`206`) when requested, but the current PDF.js setup is not forcing it.

Plan:

1. Force PDF.js to use byte-range requests
   - Update `PDFViewer.tsx` so PDF.js does not open a full-file stream first.
   - Use `disableStream: true`, `disableAutoFetch: true`, `disableRange: false`, and a sane `rangeChunkSize`.
   - Goal: the network panel should show `206 Partial Content` range requests instead of one full `200` PDF download.

2. Show page 1 first, not pages 1-3
   - Change the initial visible page set from pages `1,2,3` to only page `1`.
   - Load nearby pages only after the user scrolls.
   - This prevents the viewer from trying to render multiple huge 24x36 plan sheets before the first page appears.

3. Stop rendering the heavy PDF text/annotation layers for previews
   - For the preview viewer, render the PDF page as canvas only by setting `renderTextLayer={false}` and `renderAnnotationLayer={false}`.
   - This avoids thousands of invisible/selectable text spans being created before the user can see the drawing.
   - This does not compress the PDF, reduce quality, or change the stored file.

4. Reset viewer state when switching PDFs
   - Reset page count, loading state, page dimensions, zoom, and visible pages when a new `fileUrl` loads.
   - This prevents stale PDF state from making the viewer behave unpredictably.

5. Validate against the exact problem file
   - Reopen `Project Files → Drawings → Civil → Signature Set Grading Plan 5.5.26.pdf`.
   - Confirm there is one viewer, one loading state, first page appears quickly, and the PDF request uses byte ranges instead of a full-file download.

Technical note: this is not compression and does not alter uploaded files. It changes how the browser requests and renders the PDF, closer to how Google Drive shows the first page quickly instead of waiting on full document processing.