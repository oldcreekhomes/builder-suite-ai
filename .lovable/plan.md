# Restore direct file sharing

## Confirmed behavior
- `1x3erc8a3sce05pvfwgpv` is a file-share record for `APPROVED - Site Plan.pdf` created August 18, 2026.
- `f9tzqu04nbcrvfacjnrkj` is a separate file-share record for `Lots 1-7 Structural.pdf` created August 19, 2026. The two files did receive different links.
- Each record stores the file's original folder path. The public viewer must ignore that path for `share_type: file` links.
- The Share File dialog currently searches for and reuses an existing unexpired link for the same file. That conflicts with the requirement that every new Share File action issue a new link.

## Implementation
1. Remove existing-link reuse from the Share File dialog so every time the user opens Share File, a new 7-day `shared_links` record and unique URL are created for that exact file.
2. In the public shared-files viewer, branch on `share_type: file` before any folder/path calculations.
3. Render file shares as exactly one file row using only the filename after the final slash, with the existing Download button and 7-day expiration notice.
4. Do not render breadcrumbs, folder rows, folder counts, or Download All for file shares.
5. Leave genuine folder-share behavior unchanged.

## Verification
- Share the same file twice and confirm two different URLs are issued.
- Open both supplied links and confirm each immediately shows its own PDF and Download button.
- Confirm neither file link shows `Drawings`, nested folders, breadcrumbs, or Download All.
- Confirm an actual folder-share link still retains normal folder navigation.

## Scope
Frontend file-share creation and public file-share rendering only. No database migrations, permission changes, storage changes, automatic downloads, or unrelated application changes.