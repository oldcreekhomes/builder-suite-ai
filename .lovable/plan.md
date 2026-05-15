## Goal

Make large PDFs (like the 24MB grading plan) open in about 1 second instead of 15. No quality loss, no compression — same file, just reorganized so the viewer can stream it.

## Why it's slow today

Your PDFs are stored as one big blob. The viewer can't show page 1 until enough of the file has downloaded for it to figure out where page 1 lives — for a non-"web-optimized" PDF, that often means downloading almost the whole file. That's the 15-second wait.

The fix is to **web-optimize** (a.k.a. "linearize") each PDF. It's a one-time, lossless reshuffling of the file's internal structure that lets the viewer grab just the bytes for the page it needs to show, while the rest streams in the background. Same pixels, same resolution, same file — just arranged so it can be read progressively.

## What I'll build

1. **New edge function `linearize-pdf`**
   - Runs `qpdf --linearize` on a PDF to produce a web-optimized copy.
   - Lossless. File size stays roughly the same (often slightly smaller).

2. **Auto-optimize on upload**
   - When a user uploads a PDF to `project-files`, the function runs in the background and replaces the stored file with the linearized version.
   - Users don't wait — upload completes immediately, optimization happens in seconds afterward.

3. **One-time backfill for existing PDFs**
   - A script/edge function pass that walks every PDF currently in `project-files` and linearizes it in place.
   - Tracks progress in a small `pdf_optimization_status` table so it can resume if interrupted.
   - Can be triggered from a hidden admin button or just run once via the function.

4. **Viewer cleanup**
   - Keep the streaming config already in `PDFViewer.tsx` (range requests + `disableAutoFetch`). Once files are linearized, this config will actually work as intended.
   - Remove the redundant outer "Loading preview…" spinner — only show the inner "Loading PDF…" one so users see a single, short spinner.

## Expected result

- 24MB Signature Set Grading Plan: page 1 visible in ~1s, remaining pages stream in as you scroll.
- No quality change, no compression, no resolution change.
- Works for every PDF in the system once backfill finishes (a few minutes for the whole project).

## Technical notes

- `qpdf` is available in the Supabase Edge Function runtime via a small Deno wrapper, or we can shell out to it from a Node-based function. If the runtime can't run `qpdf` directly, the fallback is to use `pdf-lib` to rewrite the PDF with `useObjectStreams: false` and proper page-tree ordering — same end result.
- All file replacements happen inside the same `project-files` bucket and path, so existing links/permissions don't change.
- The `linearize-pdf` function is idempotent: if a file is already linearized, it skips it.
