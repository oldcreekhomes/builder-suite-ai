# Correct the Multiple Checks summary

## 1. Preserve entry order
- Show checks within each batch in the order they were entered, first to last; keep the newest batch at the top.
- The current summary fetches checks newest-first and preserves that reversed order inside each batch. Saving creates checks sequentially, so sort each batch by creation time ascending.
- Verify this batch starts with 413 E Nelson, then 412 E Nelson, Waterloo, Nob Hill, and the two N Potomac entries ($7,200 before $156.89).

## 2. Show every attached file
- Investigate attachment handling from file selection through saving, including split rows and draft restoration, and fix the confirmed loss path using the existing uploader and file viewer.
- Check both file uploads and attachment-record saves; surface failures and retain failed files for retry without creating duplicate checks or making the batch appear fully successful.
- Display every saved attachment on its correct check, with filename on hover and the existing preview/download controls.
- **Verified for the pictured batch:** only the 413 E Nelson check has a saved attachment. The other five have no attachment records, and only one file exists under the batch’s check storage paths in the save window. This is not simply a hidden-icon problem; the exact cause of loss is still unconfirmed.
- Recover the missing files if an intact draft or verifiable stored originals exist. Otherwise identify exactly which files need reattaching; do not assume the one saved PDF belongs on every check.

## 3. Rebalance column space
- Widen Cost Code / Account from 200px to approximately 280px and shorten Description from 170px to approximately 130px.
- Reduce the Amount column’s excess space and keep its value close to its heading.
- Preserve the standard single-line rows, fixed table layout, and hover access to full text.

## 4. Align headings and values
- Left-align the expanded summary’s headings and values, including Amount.
- Center-align both headings and contents for Address and Files, including lot counts, file icons, and empty dashes.
- Apply the same left-alignment to the batch summary’s counts and total; keep its action control centered.

## Technical details and checks
- Update the shared multiple-check history, loading, and attachment flow so owner and accountant dashboards receive the same corrections.
- Do not change amounts, lot allocations, accounting postings, or permissions.
- Add focused regression tests for within-batch ordering, multiple files across independent and split checks, and attachment-failure retry behavior.
- Verify a save and read-back with files on every check, then preview/download them. If signed-in testing is unavailable, explicitly report that limitation instead of claiming the flow was verified.