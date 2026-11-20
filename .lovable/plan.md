# Drawings: same drag-and-drop box as Photos

## What changes
- The top of the Drawings page gets the **same big drop box as Photos**: an upload arrow, "Upload drawings by dragging and dropping here", "Drag and drop drawings or folders here, or use the buttons in the header to select files.", and "Supports: PDF, PNG, JPG".
- Clicking anywhere in the box also opens the file picker, and you can pick as many files as you want.
- The header gets the same buttons as Photos: **Choose Drawings** and **Choose Folder**. The folder button picks a whole folder, so all 19 pages load in one go.
- When files are dragged over it, the box lights up and says "Drop drawings here", same as Photos.
- After dropping, it works the same as now: every page goes into one review screen (New or Version N), and you save.

## Technical details
- Build the drop box in `ProjectDrawings.tsx` with `react-dropzone` (`useDropzone`, `multiple: true`, accept PDF/PNG/JPG), using the same Card markup and classes as `PhotoUploadDropzone`. Dropped files and folders go to the existing `handleFiles`.
- Replace the current dashed box and the page-wide drop handler.
- Header: an outline "Choose Drawings" button (multiple input) and a "Choose Folder" button (`webkitdirectory` input, PDF/PNG/JPG only), as on the Photos page.
- While files are being prepared, the box shows the "Preparing page N..." progress and ignores new drops.
