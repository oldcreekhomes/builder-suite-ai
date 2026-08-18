# Restore direct single-file sharing

## Confirmed issue
The provided share record is correctly stored as `share_type: file` and contains exactly one file: `APPROVED - Site Plan.pdf`. The public `SharedFolder` page ignores that distinction and interprets the file's stored path (`Drawings/Site Plan/APPROVED - Site Plan.pdf`) as a folder hierarchy, forcing the recipient through multiple clicks.

## Fix
1. Update `share-redirect` to distinguish a single-file share from a true folder share.
2. For a single-file share, send the recipient directly through the validated public-file endpoint to the PDF itself so it opens immediately in the browser—no shared-folder landing page and no folder navigation.
3. Keep true folder shares routed to the existing nested-folder viewer exactly as they are now.
4. Stabilize the public-file edge function's old `esm.sh` import at the same time, because it still carries the same dependency failure that just broke `share-redirect`.
5. Preserve the exact existing Supabase share URL; no link regeneration or database changes are required.

## Verification
- Test the supplied link and confirm it resolves directly to `APPROVED - Site Plan.pdf`.
- Test an actual folder share and confirm it still opens the folder viewer with nested folders intact.
- Test invalid and expired links and confirm they remain blocked.

## Scope
Only the two public share edge functions and their focused tests will change. The shared-link record, file storage, frontend folder viewer, and link format will not be changed.