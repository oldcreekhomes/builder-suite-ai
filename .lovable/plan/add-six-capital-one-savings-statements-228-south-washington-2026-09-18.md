# Add six Capital One Savings statements — 228 South Washington Street only

The six PDFs you sent are Capital One "Business Advantage Savings" statements for Old Creek Homes, account ending 7124, covering March through August 2026. They go into the existing **Capital One - Savings** group in the Statements dialog for this project only.

## What gets added

| Label shown | Statement End Date |
|---|---|
| March 2026 | 03/31/26 |
| April 2026 | 04/30/26 |
| May 2026 | 05/31/26 |
| June 2026 | 06/30/26 |
| July 2026 | 07/31/26 |
| August 2026 | 08/31/26 |

Each row shows the same columns as the other accounts: label, statement end date, uploaded date (today), file size, and the "..." actions menu. Newest first, so August 2026 sits at the top of the group.

## How it's done

- Each PDF is uploaded into this project's file storage, same place and naming pattern as the existing statements, so preview and download work exactly like the others.
- Each one gets a file record tied to project 228 South Washington Street and to the Capital One - Savings statement account, with its statement end date set as above.
- Nothing else changes: no other project, no other account group, no code changes.

## Verification before I confirm

- Confirm each statement's period end date from its own PDF (the March file covers 03/25/26–03/31/26; the rest are checked the same way, and if any file's actual period end differs from the month end, I use the real period end from the PDF and tell you).
- Confirm the Capital One - Savings group shows 6 statements after the work.

## Technical notes

- Project `dfad3ec5-8955-4377-9c73-6c465f9941f8`; statement account `33aa3da9-02b0-4863-ae1c-b0e0ce94a4fe`.
- Uploads go to the `project-files` bucket under `<project_id>/<uuid>_Bank Statements/...`, then one `project_files` insert per file with `storage_path`, `filename`, `original_filename`, `file_size`, `mime_type`, `statement_date`, and `statement_account_id`.
- Labels are derived by the dialog from `statement_date`, so no renaming logic is needed.
