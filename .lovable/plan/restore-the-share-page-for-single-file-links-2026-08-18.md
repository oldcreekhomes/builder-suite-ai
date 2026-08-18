# Restore the share page for single-file links

Single-file share links currently redirect straight to the file (browser opens/downloads it immediately). That is wrong. They should open the normal shared-files page with the file listed and a Download button, plus the 7-day expiry notice — exactly as before.

## Changes

1. **share-redirect function** — remove the single-file bypass added in the last change. Every valid share (file or folder) redirects to the app viewer at `https://buildersuiteml.com/s/f/<id>` (photos keep `/s/p/<id>`). Keep the stable `npm:` imports and the expiry/not-found checks.

2. **public-file-download function** — keep it as the downloader used by the viewer's Download button. The `inline=true` redirect branch stays harmless but is no longer used by the redirect flow.

3. **Shared files page (single-file shares)** — make sure a share containing exactly one file renders that file directly in the list, not as a chain of folders to click through. When the share has one file and no explicit folder records, treat the file's own directory as the root so the page opens showing the file row with its Download button and the "expires in 7 days" banner.

4. **Tests** — update the share-redirect test so it asserts a 302 to the `/s/f/<id>` viewer URL for both file and folder shares.

## Verification

Deploy both functions, then open the existing link
`.../share-redirect?id=1x3erc8a3sce05pvfwgpv&type=f`
and confirm it lands on the shared-files page showing `APPROVED - Site Plan.pdf` with a working Download button and no extra folder clicks.
