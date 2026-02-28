
Goal
- Make every project page header render at the exact same vertical position and height as the working Company Dashboard and Settings headers, so the divider line aligns perfectly with the sidebar reference line.

What I found by digging through the code
1) The issue is now mainly “effective row height”, not only padding.
- `DashboardHeader` (project branch) currently has:
  - `py-3.5` (good)
  - inner row `min-h-[36px]`
  - no default-size right action button
- `DashboardHeader` (non-project) and `CompanyDashboardHeader` include the default New Project button (`h-10`), which naturally forces a 40px row.
- Result: project headers are still shorter in practice (about 4px), so their bottom border appears higher.

2) This explains why earlier “py-3.5” fixes looked correct in code but still looked wrong visually.
- Same outer padding does not guarantee same total header height when inner content has different intrinsic height.

3) Project pages are largely using the shared header already.
- The remaining mismatch is header geometry inside the shared component, not route-level duplication.

Implementation plan
1) Lock a single header geometry contract across both header components
- Files:
  - `src/components/DashboardHeader.tsx`
  - `src/components/CompanyDashboardHeader.tsx`
- Change inner header row from `min-h-[36px]` to a fixed standard row height that matches the working pages:
  - `h-10` (40px)
- Keep outer shell unchanged:
  - `bg-white border-b border-border px-6 py-3.5`
- This guarantees same total height regardless of project/non-project content.

2) Normalize project branch structure so it cannot “compress”
- File:
  - `src/components/DashboardHeader.tsx`
- Keep project controls (SidebarTrigger, Back to Project, address, edit button), but ensure they live inside the same `h-10` row container as company/settings.
- Keep only standard shadcn button sizes/variants (already a project standard), no custom compacting tweaks.

3) Keep company/settings as the visual source of truth
- File:
  - `src/components/CompanyDashboardHeader.tsx`
- Apply the same `h-10` row class there too, so both components share identical geometry by definition (not by coincidence).

4) Quick structural audit (no redesign) for project routes
- Validate these still use `AppSidebar + SidebarInset + DashboardHeader` with no extra top offset above header:
  - `ProjectDashboard.tsx`
  - `ProjectFiles.tsx`
  - `ProjectPhotos.tsx`
  - `ProjectBudget.tsx`
  - `ProjectBidding.tsx`
  - `ProjectPurchaseOrders.tsx`
  - `ProjectSchedule.tsx`
  - `ApproveBills.tsx`
  - `Transactions.tsx`
  - project-mode in `Reports.tsx`
- Only adjust if any page adds top spacing before the header (none expected from current read).

Verification checklist after implementation
- Compare line position directly on:
  - `/` (Company Dashboard)
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
  - Header bottom border sits at same Y-position as company/settings.
  - No gray strip above header.
  - Back/Edit actions still work.
  - No spacing regression on global pages.

Technical notes
- Root cause: differing intrinsic inner-row height between branches (`min-h-[36px]` + smaller project controls vs `h-10` New Project control on company/settings).
- Durable fix: enforce a fixed inner row height (`h-10`) across both header components, instead of relying on content-driven height.
