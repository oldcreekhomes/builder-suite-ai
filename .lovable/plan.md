
Fix blank app after Apartments rollout

What I found
- The preview root stays empty: the session replay shows `<div id="root"></div>` and React never mounts.
- The dev server is up and Vite is still processing HMR updates, so this is not a server outage.
- That points to a startup/module-load failure before the app can render.
- The newest startup-path changes are from the Apartments rollout:
  - `src/App.tsx` now eagerly imports `src/pages/Apartments.tsx`
  - the company dashboard sidebar files now load the new Apartments link on `/`

Plan
1. Isolate Apartments from app startup
   - In `src/App.tsx`, replace the eager Apartments import with `React.lazy`.
   - Wrap only the `/apartments` route in `Suspense`.
   - This prevents one new page from blanking the entire app before React mounts.

2. Harden the root dashboard startup path
   - Review the new Apartments nav additions in:
     - `src/components/sidebar/CompanyDashboardNav.tsx`
     - `src/components/sidebar/SidebarNavigation.tsx`
   - Simplify those new link blocks and remove unused sidebar imports so `/` stays as stable as possible.

3. Make Apartments safe when it is opened
   - In `src/pages/Apartments.tsx`, add explicit states for:
     - no authenticated user
     - missing profile / missing effective owner id
     - failed `apartment_pro_formas` query
   - Fix the current loading logic so it cannot sit forever if owner resolution returns null.
   - Bring the page into the standard authenticated app shell so it behaves like the rest of the product.

4. Re-test the critical flows
   - Refresh `/` while logged in
   - Refresh `/` while logged out
   - Open `/apartments`
   - Create, select, save, and delete a pro forma
   - Refresh directly on `/apartments`

Technical detail
- Error boundaries only help after React is already mounted. A bad static import in `App.tsx` can fail before any fallback UI appears.
- The safest first fix is to lazy-load `Apartments`, because it removes the newest feature from the root import path without removing the feature itself.
- There is also a secondary bug inside `Apartments.tsx`: if `effectiveOwnerId` resolves to `null`, the page can remain stuck in loading.

Files involved
- `src/App.tsx`
- `src/pages/Apartments.tsx`
- `src/components/sidebar/CompanyDashboardNav.tsx`
- `src/components/sidebar/SidebarNavigation.tsx`
