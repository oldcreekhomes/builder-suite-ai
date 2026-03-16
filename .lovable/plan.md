

## Plan: Show Full Sheet Index in Exhibit B (On-Screen + Print)

### Problem
The 68-entry sheet index was added to `DEFAULT_EXHIBITS.projectDrawings`, but the user's saved database record still contains the old generic sentence ("Subcontractor shall perform work in accordance with approved civil, landscape and architectural drawings listed in the project drawing schedule."). The migration layer doesn't update `projectDrawings`, so both the on-screen textarea and print output show the old text.

### Changes

**1. Add a data migration for `projectDrawings`** (`SubcontractorContractForm.tsx`, ~line 179)
- After the existing scope-of-work migration check, add a similar check: if saved `projectDrawings` does not contain "Sheet 1: Cover Sheet", replace it with the new `DEFAULT_FIELDS.projectDrawings` (which pulls from the updated `DEFAULT_EXHIBITS`).
- This is a one-time migration — once the user edits and saves, the new value persists.

**2. Add multi-page support for Exhibit B in print** (`SubcontractorContractForm.tsx`, ~line 362)
- Currently Exhibit B is rendered as a single page. With 68 entries it will overflow past the footer.
- Apply the same line-based chunking approach used for Exhibit A: split `projectDrawings` text into lines, group into chunks that fit within the page content area, and render each chunk as a separate page with header ("EXHIBIT B – PROJECT DRAWINGS" / "EXHIBIT B – PROJECT DRAWINGS (CONTINUED)") and footer.
- Update the total page count calculation to account for multiple Exhibit B pages.

**3. Adjust page numbering** (`SubcontractorContractForm.tsx`)
- Update `totalPages`, `exhibitBPageNum`, and `sigPageNum` to reflect the dynamic Exhibit B page count.

### Files to Edit
- `src/components/templates/SubcontractorContractForm.tsx`

