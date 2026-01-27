
Goal: Restore the Preview (currently blank white screen on both `/` and `/auth`) by identifying whether the app is failing to mount (runtime/import error) or mounting but rendering “nothing” due to auth loading never resolving, and then implementing robust safeguards so this cannot silently “white-screen” again.

What we know from exploration
- The Preview is a blank white page (no spinner, no text), even on `/auth`.
- The only captured console message is a Tailwind CDN warning; none of the expected app logs appear (e.g., “🔗 Initializing Supabase client…”, “PDF.js configured…”, “🔑 AuthProvider initializing…”).
- This strongly suggests React is not mounting at all (script/module load failure or early runtime crash) OR it mounts but immediately renders an empty div (e.g., RootRoute spinner div with no Tailwind styles + no text).
- Current code (as read) shows:
  - `index.html` has `#root` and loads `/src/main.tsx`.
  - `main.tsx` renders `<ImpersonationProvider><AuthProvider><App/></AuthProvider></ImpersonationProvider>`.
  - `App.tsx` error boundary is inside `AppContent`, so it will NOT catch errors that occur in `ImpersonationProvider` / `AuthProvider` / the `pdfConfig` import, etc.
  - `RootRoute` loading UI is spinner-only (no text). If Tailwind isn’t applying, it can look like a blank page.
  - `ProtectedRoute` returns `null` while loading, which can also yield blank UI if you land on protected routes (though user reports `/auth` also blank).

Most likely root causes (ranked)
1) Early crash before React mounts (import-time error), which would yield a blank screen and prevent all our logging from appearing.
   - Because `ErrorBoundary` is not wrapping `main.tsx` providers, any error in providers or top-level imports can “white-screen” the app.
2) Auth loading never resolves AND the only “loading UI” is a Tailwind-dependent spinner with no text, causing a blank-looking screen.
   - Would also explain why `/auth` seems blank if routing never gets rendered or is behind higher-level blank.
3) A build/module load issue (e.g., Vite runtime failing to serve the module, or a missing asset import) causing `main.tsx` never to execute.
   - This typically produces a console error, but the current log snapshot is incomplete, so we need better capture.

Implementation approach (what I will change in Default mode)
A) Make failures visible immediately (stop silent white-screens)
1. Move/duplicate an ErrorBoundary to the earliest possible place:
   - Wrap the entire app in an ErrorBoundary at `main.tsx` level so errors in providers and early imports are caught and displayed.
2. Add an always-visible “boot” fallback that does not depend on Tailwind:
   - Add a minimal inline loading message (plain HTML/text) so even if Tailwind fails, the user sees something.
   - Example: “Loading BuilderSuite AI…” as plain text plus a basic CSS spinner or no spinner.
3. Add a global error logger (development-only):
   - Add `window.onerror` and `window.onunhandledrejection` handlers in `main.tsx` (or a small bootstrap file) to `console.error` the actual crash reason.
   - This ensures Lovable console capture will include the real error next message.

B) Fix the “auth loading can hang forever” class of problems
4. Make `AuthProvider` loading state resilient:
   - Add a “max wait” timeout (e.g., 6–10 seconds). If `getSession()` hasn’t returned, set `loading=false` and store an error state like `authInitError`.
   - Display a friendly “Auth is taking longer than expected” message with a “Retry” button that re-runs `getSession()`.
   - This prevents permanent blank/spinner states.
5. Make loading UI non-empty everywhere:
   - `RootRoute`: include a text label under spinner so it’s not invisible without Tailwind.
   - `ProtectedRoute`: return a small loading layout (text + spinner) rather than `null`.

C) Verify module execution path with minimal instrumentation
6. Add a single unmistakable “boot log” at the very top of `main.tsx`:
   - e.g., `console.log("[BOOT] main.tsx loaded")`
7. Add a single “App mounted” log inside `App` render:
   - Confirms React is actually rendering.
8. If still blank, the logs will tell us if the JS bundle isn’t loading at all (no [BOOT]) vs. crashing after boot.

D) Quick verification steps after changes (in Preview)
9. Load `/`:
   - Expect to see at least the plain “Loading…” text immediately.
   - If auth works: Landing or Index should render.
10. Load `/auth`:
   - Should always render, regardless of auth state.
11. If it still fails:
   - Use the now-captured `[BOOT]` log and global error handlers to pinpoint the exact module/error.

Files I expect to modify (Default mode)
- `src/main.tsx`
  - Add early ErrorBoundary wrapper
  - Add `[BOOT]` log + global error handlers
- `src/components/RootRoute.tsx`
  - Add non-Tailwind-dependent text while loading
- `src/components/ProtectedRoute.tsx`
  - Replace `return null` with a minimal loading UI
- `src/hooks/useAuth.tsx`
  - Add auth init timeout + optional `authInitError` state exposed in context
  - Ensure `loading` always eventually becomes false
- (Optional) `src/components/ErrorBoundary.tsx`
  - Ensure it can be used at top-level without relying on app theme classes, or add a simple fallback prop usage in `main.tsx`

User-visible result
- The Preview will never be completely blank again:
  - If something breaks, you’ll see an ErrorBoundary panel with details.
  - If auth is slow/hung, you’ll see a clear message and a retry option.
- We’ll get definitive console output to diagnose any remaining issue in one iteration.

Risks / tradeoffs
- Adding timeouts can mask intermittent network problems; we’ll pair it with a visible error message and a retry action rather than silently proceeding.
- Global error handlers will be noisy in production if left on; we’ll keep them development-only (Preview) or guard them to avoid leaking sensitive info.

Immediate next step
- Switch me to Default mode so I can implement the boot-level ErrorBoundary + visible loading fallback + auth timeout safeguards, then we’ll re-check the Preview and the newly captured console errors (if any).