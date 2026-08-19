# Restore the single-file share landing page

## Goal
Make the supplied share link open the normal 7-day viewer directly on **APPROVED - Site Plan.pdf**, with its **Download** button. It must not auto-download and must not show `Drawings`, `Site Plan`, breadcrumbs, or any other folder navigation.

## Implementation
1. Keep `share-redirect` pointing to the public `/s/f/<share-id>` viewer rather than a storage URL or direct download.
2. Make the viewer treat a `share_type: file` record as an explicit single-file mode before any folder-tree/path derivation occurs.
3. In that mode, use only the final filename segment for display and render exactly one file row with the existing Download action and 7-day expiration notice.
4. Leave genuine folder shares and multi-file shares on the current folder-navigation behavior.

## Verification
- Open the exact share ID `1x3erc8a3sce05pvfwgpv` through the supplied redirect link.
- Confirm the first page shows **APPROVED - Site Plan.pdf** and its Download button.
- Confirm there are no `Drawings` or `Site Plan` folder rows and no automatic download.
- Confirm a genuine folder share still displays its folder hierarchy.

## Scope
Frontend share-view behavior only. No database migrations, permission changes, link replacement, expiration changes, or unrelated application changes.