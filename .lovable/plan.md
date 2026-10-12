# Restore the same PDF to all six checks

- Use the existing **Old Creek Homes_September 2026_Invoice_OST Consulting LLC-compressed.pdf** attached to 413 E Nelson. You confirmed this is the same file intended for every entry.
- Restore it to the other five checks in the October 12, 3:30 PM batch: 412 E Nelson, Waterloo, Nob Hill, and both N Potomac entries.
- Keep each file attached to its individual check so it appears in both the batch summary and the check’s normal file viewer.
- Leave all check amounts, entry order, accounting postings, and permissions unchanged. Do not create new checks or ask you to upload the same PDF again.

## Technical details
- This is a narrowly scoped attachment repair, not a new batch-wide attachment feature.
- Verify the existing storage object is intact and inspect file deletion behavior before restoring attachments. Prefer independent per-check storage copies through the Storage API; if shared references are required, ensure removing one attachment cannot break the others.
- Insert only the five missing attachment records, with duplicate protection and the existing audit conventions. Preserve company-only access.
- Read back all six checks to confirm the PDF appears on each. Verify preview/download where authenticated access is available; explicitly disclose any verification limitation.