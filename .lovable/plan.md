
Goal: make project-specific pages use the same header sizing/alignment behavior as the working company dashboard/settings header, so border lines and spacing are visually identical everywhere.

What I found
- The “working” pages are using the standard header sizing pattern (`py-3.5`, no top margin) and a consistent header structure.
- `DashboardHeader.tsx` still has a separate project-specific rendering path (different content structure than company/settings), which keeps layout behavior inconsistent even after padding changes.
- `ProjectDashboard.tsx` is still using its own inline header instead of the shared header component, so it can drift from the standard.
- This explains why fixes felt partial: one page got class adjustments, but the architecture still has multiple header implementations.

Implementation plan
1) Make `DashboardHeader` truly uniform for all contexts
- File: `src/components/DashboardHeader.tsx`
- Keep one standardized header shell (same container classes and vertical rhythm as company/settings).
- Preserve project context actions (Back to Project, project edit menu), but place them inside the same shell structure so total header height and border position remain identical.
- Ensure no project-only compact structure can create a different header height.

2) Refactor `ProjectDashboard` to use the shared header
- File: `src/pages/ProjectDashboard.tsx`
- Remove the inline custom `<header ...>` block.
- Replace with `<DashboardHeader projectId={projectId} />` (or with title if needed), so project dashboard uses the same header component as files/photos/bidding/etc.
- Keep existing page-specific content (status chip/cards/weather) below the header.

3) Standardize remaining project page wrappers only where needed
- Files to validate (and touch only if inconsistent):
  - `src/pages/ProjectFiles.tsx`
  - `src/pages/ProjectPhotos.tsx`
  - `src/pages/ProjectBudget.tsx`
  - `src/pages/ProjectBidding.tsx`
  - `src/pages/ProjectPurchaseOrders.tsx`
  - `src/pages/ProjectSchedule.tsx`
  - `src/pages/ApproveBills.tsx`
  - `src/pages/Transactions.tsx`
  - `src/pages/Reports.tsx`
- Confirm they all render `DashboardHeader` directly at top of main content and do not introduce page-level top offsets/margins above the header.

4) Keep the visual standard explicit
- Match the known-good standard from memory:
  - no top margin above header
  - `py-3.5` vertical padding
  - `bg-white border-b border-border`
- Avoid introducing per-page header exceptions going forward.

5) Verification checklist (post-implementation)
- Compare side-by-side against Settings + Company Dashboard:
  - `/project/:id`
  - `/project/:id/files`
  - `/project/:id/photos`
  - `/project/:id/bidding`
  - `/project/:id/purchase-orders`
  - `/project/:id/schedule`
  - `/project/:id/accounting/bills/approve`
- Confirm:
  - no gray strip above project headers
  - same header height across pages
  - bottom border line aligns with sidebar reference line exactly
  - no regressions to back navigation or edit actions.

Technical notes
- Root cause is architectural duplication (custom header in `ProjectDashboard` + divergent project branch in `DashboardHeader`), not just a single class typo.
- The stable fix is to enforce one shared header structure and let pages only control content, not header geometry.
