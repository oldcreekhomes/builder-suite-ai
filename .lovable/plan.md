# Drawings viewer: confirm delete, close button, sharp zoom

## What changes
1. **Delete asks first:** the trash button opens the app's standard "Are you sure?" window, the same one used everywhere else, in place of the browser's grey pop-up. It says something like "Delete Version 1 of sheet 1 - Cover Sheet? This can't be undone."
2. **Close button:** a clear **X** in the top-right corner, beside the sheet title, takes you back to the list of drawings. The Esc key also closes it.
3. **Sharp when you zoom in:** the viewer shows the original full-quality drawing file instead of the small preview picture.
   - When you open a sheet, it loads the saved original PDF page at high detail.
   - As you zoom in, it re-draws the sheet at that zoom level, so small text stays crisp up to 8x.
   - The small preview picture appears right away while the sharp version loads, so the screen is never blank.
   - New uploads still save the original PDF untouched, with no compression. Only the small thumbnails on the list are reduced. Drawings you've already uploaded become sharp too, because their original PDFs are already saved.

## Technical details
- Replace `confirm()` in `deleteVersion` (and the sheet delete, if it has one) with `DeleteConfirmationDialog` from `@/components/ui/delete-confirmation-dialog`, using a `pendingDelete` state.
- In the full-screen `DialogContent`, hide the built-in close button and add a visible X `Button` (ghost, icon) in the header row.
- `ZoomableImage` gets the version's `file_path` PDF. It renders page 1 with pdfjs to a canvas sized to container × devicePixelRatio × zoom, capped at about 8000px on the long side and debounced 250ms after the wheel stops. It falls back to the JPG preview while rendering, and the pdf document is kept in a ref and destroyed when closed.
