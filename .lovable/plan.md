## Change to `src/components/CreatePurchaseOrderDialog.tsx`

In the Attachments section (lines ~829-875), once files have been uploaded the dropzone disappears and there's no way to add more.

**Fix:** Always render an "Add Files" button alongside the file icons when `uploadedFiles.length > 0`, matching the Software Issues dialog style.

- Keep the existing empty-state dropzone (lines 832-845) unchanged.
- In the `else` branch (lines 847-873), prepend an `Add Files` button before the mapped file icons inside the same flex container.
- The button uses `getRootProps()` / `getInputProps()` from the existing `useDropzone` instance so a click opens the file picker and drag-and-drop still works.
- Style: `Button variant="outline" size="sm"` (h-8) so it sits inline with the file icons; disabled while `isUploading`; label switches to "Uploading..." when uploading.
- No backend / upload logic changes — `onDrop` already appends to `uploadedFiles`.

No other files affected.
