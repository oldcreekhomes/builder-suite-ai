# Drawings: upload as many files as you want at once

## What changes
- **Upload Drawing Set** will let you pick any number of files at once, using Shift-click or Cmd/Ctrl-click (for example, all 19 pages in a folder).
- You can also **drag and drop** a group of files, or a whole folder, onto the Drawings page.
- Each file can be a one-page PDF, a multi-page PDF (split into pages like today), or an image of a sheet (PNG/JPG).
- All the pages from every file land in **one review screen**, in the order the files were picked or sorted by name. Each page shows New or Version N, and you can fix sheet numbers before saving, same as now.
- A progress line shows "Preparing page 7 of 19..." while the files are being split.
- If one file can't be read, the others still load, and a message names the file that failed.

## Technical details
- `ProjectDrawings.tsx`: add `multiple` to the file input and accept `application/pdf,image/png,image/jpeg`. `handleFile(file)` becomes `handleFiles(files[])`, which loops through the files and adds their pages to one `pending` list. Images go into a one-page PDF with pdf-lib (`embedPng`/`embedJpg`) and their own image is used as the thumbnail.
- Add a drop zone on the page that collects dropped files and the files inside dropped folders (`webkitGetAsEntry`).
- Each file's title-block reading runs on its own (at most 4 at a time), so 19+ pages don't overload the reader.
- Saving still goes through `add_drawing_version` one page at a time, so the version-number rules don't change.
