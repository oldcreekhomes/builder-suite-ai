# Show a Single Shared File Immediately

## Goal
Make the existing share link open directly on the second screen shown in the attachment: **APPROVED - Site Plan.pdf**, its **Download** button, and the **7-day expiration** notice. It must not display or require navigation through `Drawings` or `Site Plan` folders.

## Implementation
- Treat a `shared_links` record with `share_type: file` and exactly one file as an explicit single-file view.
- Ignore folder segments embedded in that file's `original_filename` only for this single-file view.
- Render the file immediately using `APPROVED - Site Plan.pdf` as the visible filename while keeping the existing download behavior and expiration notice.
- Leave genuine folder shares and multi-file shares unchanged.

## Verification
- Add focused coverage for a file whose stored name is `Drawings/Site Plan/APPROVED - Site Plan.pdf`.
- Verify the supplied redirect link lands on a page showing one PDF row and no folder rows.
- Verify the Download button still retrieves the shared PDF and expiration enforcement remains active.

## Confirmed Current Data
The supplied share ID is an active `share_type: file` record containing exactly one PDF. Its stored filename includes the folder path `Drawings/Site Plan/`, which is what must be hidden in this single-file view.
