# Restore the direct single-file download view

## Goal
The share link must open directly to the screen shown in the second attachment: **APPROVED - Site Plan.pdf** with its **Download** button and 7-day notice. The user must not see or click through `Drawings` or `Site Plan` folders.

## Plan
1. Keep the dedicated single-file renderer already verified in the preview; it bypasses folder and breadcrumb rendering for `share_type: file` links.
2. Preserve real folder shares exactly as they work now.
3. Clear the three confirmed publishing blockers by removing only the unconditional cross-company write policies:
   - Bank reconciliations will continue using the existing company-scoped access policy.
   - Marketplace company listings will retain public directory reads and owner-scoped creation/editing.
   - Marketplace representatives will gain owner-scoped creation, editing, and deletion through their parent marketplace company while retaining directory reads.
4. Re-run the security check, publish the frontend, and verify the exact public share link shows the PDF row immediately with no folder row.

## Confirmed current state
- The exact share record is a one-file share containing `Drawings/Site Plan/APPROVED - Site Plan.pdf`.
- The corrected preview already renders one PDF row, one Download button, zero folder icons, and no `Drawings` text.
- The live custom domain still shows the old folder viewer because publishing is blocked by three active database security findings.

## Scope
No replacement link, no direct browser download, no expiry change, and no behavior change for genuine folder shares.