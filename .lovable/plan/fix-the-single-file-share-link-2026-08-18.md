# Fix the single-file share link

## Goal
Make the existing link show only **APPROVED - Site Plan.pdf**, its **Download** button, and the 7-day expiry notice—no `Drawings` folder and no folder navigation.

## Plan
1. Keep the share as a normal 7-day viewer link; do not convert it to a direct download.
2. Harden the shared-files page so any `share_type: file` link renders a dedicated single-file view and completely bypasses all folder derivation, regardless of directory segments in `original_filename`.
3. Verify the exact share ID renders one PDF row with no folder rows in the preview.
4. Publish the corrected frontend so `buildersuiteml.com/s/f/1x3erc8a3sce05pvfwgpv` receives the fix, then verify that exact public URL.

## Confirmed current state
- The database record is `share_type: file` and contains exactly one PDF.
- Its stored filename is `Drawings/Site Plan/APPROVED - Site Plan.pdf`; those directory segments are incorrectly appearing as folders.
- The custom domain is serving an older viewer bundle that does not contain the current single-file handling.

## Scope
No database changes, no link replacement, no expiry changes, and no changes to genuine folder shares.