# Restore the file viewer everywhere

## What broke
The speed update split the PDF library into its own separate download. The file viewer (used by Files, Bids, POs, Bills, Checks, Deposits, etc. — they all share one viewer) depends on that library loading in a specific order, and the split breaks that in the published app, so files open with no PDF viewer.

## Fix
1. Remove the PDF library split from the build settings (keep the spreadsheet split and all other speed gains — pages still load on demand).
2. Build the published version locally and open a PDF in the shared viewer to confirm it shows pages, zoom, and the Download button.
3. Spot-check opening a file from Project Files, a bid proposal, and a PO attachment.

## Technical details
- `vite.config.ts`: delete the `if (id.includes("/pdfjs-dist/")) return "vendor-pdfjs";` line in `manualChunks`. `pdfjs-dist` is imported eagerly by `src/lib/pdfConfig.ts` in `main.tsx` and by `react-pdf`; forcing it into a separate chunk causes cross-chunk init ordering failures.
- Verify via `vite build` + `vite preview` and Playwright on a public route that renders `PDFViewer`, checking console for worker/init errors.
- If the issue persists after that, inspect the pdf worker URL in `pdfConfig.ts` (unpkg version match) as the next suspect.
