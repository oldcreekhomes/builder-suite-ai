
Objective
- Make project-specific pages use the exact same header geometry as Company Dashboard and Settings, so the header border aligns perfectly with the sidebar reference line on every page.

What is still wrong (confirmed in code)
1) `src/pages/ProjectDashboard.tsx` still uses its own custom inline `<header>` instead of the shared header component.
- This keeps one page on a separate layout path, so it can drift from standards again.

2) `src/components/DashboardHeader.tsx` still has a compact project-only header structure.
- The project branch uses smaller-height content and a `-my-1` negative margin on the Back button.
- Even with `py-3.5`, this reduces effective header height versus the company/settings header (which uses larger row content and no negative compression).

3) Result: project pages can still appear vertically off compared with Company Dashboard/Settings despite prior padding edits.

Implementation approach
1) Enforce a single header “shell geometry” for both header components
- Files:
  - `src/components/DashboardHeader.tsx`
  - `src/components/CompanyDashboardHeader.tsx`
- Apply identical outer shell classes and fixed vertical geometry:
  - `bg-white border-b border-border px-6 py-3.5`
  - add a shared minimum/header row height so content differences cannot change border position.
- Remove compacting styles in project branch (`-my-1` on Back button).
- Keep actions/content (Back to Project, project address, edit menu, New Project) but ensure they live inside the same height-constrained shell.

2) Remove Project Dashboard’s custom header and use shared `DashboardHeader`
- File: `src/pages/ProjectDashboard.tsx`
- Replace the inline `<header ...>` block with:
  - `<DashboardHeader projectId={projectId} />`
- Keep existing cards/status/weather content below header unchanged.
- Keep edit dialog behavior by routing edit trigger through `DashboardHeader` project branch (already supported there) so functionality is preserved.

3) Normalize project page container structure (only where needed)
- Confirm these use `AppSidebar + SidebarInset + DashboardHeader` with no top offset above header:
  - `src/pages/ProjectFiles.tsx`
  - `src/pages/ProjectPhotos.tsx`
  - `src/pages/ProjectBudget.tsx`
  - `src/pages/ProjectBidding.tsx`
  - `src/pages/ProjectPurchaseOrders.tsx`
  - `src/pages/ProjectSchedule.tsx`
  - `src/pages/ApproveBills.tsx`
  - `src/pages/Transactions.tsx`
  - `src/pages/Reports.tsx` (project mode branch)
- No redesign needed; just ensure none introduces margin/padding above the header shell.

Exact code-level changes planned
- `DashboardHeader.tsx`
  - Remove `-my-1` from project Back button.
  - Standardize project header row sizing to match company/settings row height.
  - Keep project-specific actions but prevent layout compression.
- `ProjectDashboard.tsx`
  - Delete custom header markup and use shared `<DashboardHeader projectId={projectId} />`.
  - Remove now-unused imports tied only to old inline header (e.g., `Building2`, `MoreHorizontal`, project edit button wiring in this page if fully delegated).

Why this will fix it
- Right now alignment differences come from different header implementations and compressed project content.
- After this change, all project pages and company/settings pages will share one geometric header contract (same shell + same effective height), so the border sits at the same Y-position everywhere.

Verification checklist (after implementation)
- Compare with Settings and Company Dashboard as reference:
  - `/`
  - `/settings`
  - `/project/:id`
  - `/project/:id/files`
  - `/project/:id/photos`
  - `/project/:id/budget`
  - `/project/:id/bidding`
  - `/project/:id/purchase-orders`
  - `/project/:id/schedule`
  - `/project/:id/accounting/bills/approve`
  - `/project/:id/accounting/transactions`
  - `/project/:id/accounting/reports`
- Confirm:
  - No gray strip above main header.
  - Same header height on all pages.
  - Header bottom border aligns with sidebar reference line consistently.
  - Back button and edit actions still work on project pages.

Risk and mitigation
- Risk: `ProjectDashboard` could lose status-pill visibility in header after unifying.
- Mitigation: keep status badge directly below header in page content if needed, rather than reintroducing a custom header. This preserves alignment standard while retaining project context UI.
