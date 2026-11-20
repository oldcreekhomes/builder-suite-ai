# Drawings: keep sheet numbers in one format

## What's wrong
- The sheet number reader sometimes copies the "Sheet 2 of 19" count from the title block and sometimes just the number. So the same set comes back as "2 of 19", "3 of 19", then "4", "5".

## What changes
- Before a sheet number is shown, it's cleaned up: "2 of 19", "Sheet 2 of 19", "2/19" and "SHEET 2" all become **2**. A real sheet code like "A-101" stays "A-101".
- Matching for versions uses the cleaned number, so "2 of 19" today and "2" next month count as the same sheet (Version 2).
- The reader is told to return only the sheet number, never the "of 19" count.
- Anything you type yourself on the review screen gets the same cleanup when you save.

## Technical details
- `src/lib/drawingSheets.ts`: add `cleanSheetNumber()` (strips leading "Sheet"/"Sht"/"Dwg", trailing "of N" or "/N", and extra spaces). `sheetKey()` calls it first.
- `ProjectDrawings.tsx`: apply `cleanSheetNumber` to the reader's result and before calling `add_drawing_version`.
- `add_drawing_version` SQL: apply the same cleanup in the key (regex strips "sheet" prefix and "of N" suffix) so database matching agrees with the app.
- `detect-sheet-info` prompt: add "Return only the sheet identifier (e.g. A-101 or 2). Never include 'of N' page counts."
- Tests in `src/lib/drawingSheets.test.ts`: "2 of 19" becomes "2"; "Sheet 3 of 19" becomes "3"; "A-101" stays "A-101"; "2 of 19" and "2" share one key.
