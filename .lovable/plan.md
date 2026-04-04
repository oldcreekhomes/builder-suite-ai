
Assessment
- The apartment feature does not appear to still be wired into the current `src` route tree. I only found the word “apartment” in unrelated text/parsing code, not in active routes/imports.
- The session replay shows the page loads, but `#root` stays empty. So React is not mounting any UI at all.
- There were no `[BOOT] main.tsx loaded` logs captured. That strongly suggests the failure is happening before `createRoot(...).render(...)` runs.
- So the blank screen is likely not “the apartment page still rendering.” It is more likely an import-time crash somewhere in the app bootstrap/import graph.

Plan
1. Isolate app boot from the full route tree
   - Temporarily reduce `src/App.tsx` to a minimal shell that can render on `/`.
   - Goal: prove React can mount again before pulling the whole app back in.

2. Narrow the broken import
   - Reintroduce route groups in chunks inside `src/App.tsx`:
     - public pages
     - company dashboard/root
     - project pages
     - accounting pages
     - marketplace/templates
   - When the blank screen returns, narrow from that group to the exact module.

3. Fix the actual failing module
   - Remove any top-level side effects.
   - Move browser-only code (`window`, `document`, storage, setup code, subscriptions) into component/effect scope.
   - Guard any unsafe assumptions so the module can import cleanly.

4. Harden the app so one bad page cannot blank everything
   - Convert large page imports in `src/App.tsx` to lazy-loaded routes with `Suspense`.
   - Keep a minimal visible fallback while route chunks load or fail.

5. Re-verify the startup paths
   - Signed out `/` should show `Landing`
   - Signed in `/` should show `RootRoute` loading/UI
   - Protected routes should redirect or load, not blank

Files to touch
- `src/App.tsx` — main isolation point
- `src/main.tsx` — keep bootstrap/fallback resilient
- whichever page/component is identified during route reintroduction

Technical detail
- Even though `main.tsx` has a log at the top, ES module imports are evaluated before that top-level code runs.
- That means a thrown error anywhere in the imported dependency tree can stop the app before your boot log and before the ErrorBoundary ever appears.
- This matches the behavior here much better than “the apartment section is still crashing.”
- The Vite websocket warnings are likely unrelated; they affect hot reload, not whether `#root` renders at all.

Expected result
- Restore a visible shell first.
- Identify the exact import causing the startup crash.
- Make the app resilient so future feature work cannot take down the whole application at boot.
