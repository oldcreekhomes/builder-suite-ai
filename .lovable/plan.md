# Restore direct single-file share view

## Goal
Make the existing share link open the requested PDF immediately as a single file row with its **Download** button and 7-day expiration notice—no `Drawings` folder, no `Site Plan` folder, and no automatic download.

## Implementation
1. In the public shared-files viewer, handle `share_type: file` before any folder-tree or path derivation runs.
2. Render the one shared file using only the final filename segment (`APPROVED - Site Plan.pdf`) while preserving the existing Download action and expiration behavior.
3. Keep `share_type: folder` behavior unchanged so actual folder shares still retain their hierarchy.
4. Verify the exact share ID `1x3erc8a3sce05pvfwgpv` renders one PDF row with no folder navigation, then publish the frontend correction to the live domain.

## Scope guard
- No database migrations or permission changes.
- No changes to file storage, share expiration, or download behavior.
- No changes to unrelated screens or features.