
Fix the persistent blank screen by shrinking the app’s startup import graph

What I think is actually happening
- Do I know what the issue is? Yes.
- This does not look like an Apartments formula bug. It looks like a startup module-load failure before React mounts.
- Evidence:
  - session replay shows `#root` stays empty
  - dev-server logs show no build failure
  - the console snapshot only shows the usual Vite websocket warning, not the `[BOOT]` logs from `main.tsx`
- Why that matters:
  - `main.tsx` imports `App.tsx`
  - `App.tsx` still eagerly imports a very large set of pages and guards
  - `RootRoute.tsx` also eagerly imports `Index`, `Landing`, and `MarketplacePortal`
  - if any one of those modules fails to fetch/evaluate, React never mounts and the whole app goes white
- Apartments likely exposed this by enlarging the startup path and touching sidebar code that is loaded by `/`

Implementation plan
1. Minimize app boot
   - Convert route pages in `src/App.tsx` from eager imports to `React.lazy`
   - Wrap route elements in `Suspense` with a visible in-app loading state
   - Prioritize `RootRoute`, `Marketplace`, `Templates`, `Accounting`, project pages, and other authenticated routes

2. Remove eager imports from the root decision path
   - In `src/components/RootRoute.tsx`, lazy-load `Index`, `Landing`, and `MarketplacePortal`
   - Keep only auth/user-type lookup in the initial path

3. Harden Apartments
   - Update `src/pages/Apartments.tsx` so it cannot hang when owner lookup fails or returns null
   - Add explicit states for:
     - no authenticated user
     - missing profile row
     - failed `apartment_pro_formas` query
   - Move it into the normal app shell (`AppSidebar`, `SidebarInset`, `CompanyDashboardHeader`)

4. Keep the new sidebar link low-risk
   - Re-check `src/components/sidebar/CompanyDashboardNav.tsx` and `src/components/sidebar/SidebarNavigation.tsx`
   - Keep Apartments as a plain nav item only, with no extra boot-time complexity

5. Add temporary startup diagnostics
   - Add a few targeted `console.log` markers in:
     - `src/main.tsx`
     - `src/App.tsx`
     - `src/components/RootRoute.tsx`
     - `src/pages/Index.tsx`
   - This will show exactly how far startup gets if the preview still blanks

Expected result
- `/` loads even if one feature module has an import/fetch problem
- `/apartments` is isolated instead of taking down the whole app
- if Apartments still has a page-specific bug, users get a route-level loading/error state instead of a blank application

Files to update
- `src/App.tsx`
- `src/components/RootRoute.tsx`
- `src/pages/Apartments.tsx`
- `src/components/sidebar/CompanyDashboardNav.tsx`
- `src/components/sidebar/SidebarNavigation.tsx`
- optionally `src/main.tsx` and `src/pages/Index.tsx` for temporary diagnostics

Technical detail
- The core issue is architectural: too many static imports are in the initial boot path.
- In Vite/ES modules, static imports are resolved before module execution, so one failed module request can prevent `main.tsx` from ever reaching its boot logs or mounting React.
