# Drawings: fix the upload that stopped after page 1

## What happened
- At Woodstock, the app prepared page 1 of your drop (saved a 2.7 MB picture of it at 5:09 PM), then never got to page 2. After that the app made no more uploads at all.
- Nothing is saved to Drawings until you press Save on the review screen, and that screen only opens after every page is ready. So when it stalled on page 2, you saw nothing and got no error.
- The likely cause is that big drawing sheets are too slow and heavy to turn into pictures in the browser: page 1 alone made a 2.7 MB picture. I haven't confirmed why it stopped on page 2, so step 1 below is to log exactly where it stops.

## What changes
1. **The review screen opens right away.** Each page shows up as soon as it's ready, with a line like "Preparing 7 of 19". You see progress instead of a blank page.
2. **Smaller, faster previews.** Each page's preview picture is made smaller (about 1600 pixels wide, JPG instead of PNG), around 10 times smaller. This is only for the preview and reading the sheet number. **The saved PDF of each sheet stays full quality.**
3. **One bad page can't freeze the rest.** If a page takes more than 60 seconds or fails, it's marked "Couldn't read: file name, page N" and the rest keep going. A message lists anything that failed.
4. **Clear count up front.** When you drop, it says how many files and pages it found (e.g. "19 files, 19 pages"). If it finds none, you get a message instead of silence.
5. **No surprise loss.** While pages are being prepared, a warning appears if you try to leave the page.

## Technical details
- `ProjectDrawings.tsx`: open the review dialog before processing and append to `pending` per page. Add a per-page `withTimeout(60s)` around render, split and upload. Errors are `console.error`ed with file name and page number so a future stall can be pinpointed.
- `renderPage`: scale so the longest side is no more than 1600px, `toBlob("image/jpeg", 0.8)`, then release the canvas (width = 0) and call `page.cleanup()` after each page, and `pdf.destroy()` after each file.
- Count the total pages first (pdf.js `numPages`, images = 1) for "N of total".
- Saving still goes through `add_drawing_version`, and image paths end in `.jpg`, so the PDF path replacement keeps working.
- Remove the orphan 1.png that was left from the stalled Woodstock upload.
