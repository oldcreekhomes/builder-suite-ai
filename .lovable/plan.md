## Diagnosis

I loaded `/project/c245acb9.../accounting/transactions` in the sandbox preview and it renders without errors — the Transactions page code itself is fine, and the production build compiles cleanly (`Transactions-CvxWj1ZD.js` builds successfully).

Your screenshot is from **buildersuiteml.com** (the published custom domain), and the console error we saw earlier was:

> Failed to fetch dynamically imported module: `.../assets/ProjectDashboard-CFjmiVZq.js`

That hash (`CFjmiVZq`) does not match any chunk in the current build. This is the classic **stale-chunk-after-deploy** problem:

- The published site has an old `index.html` cached somewhere in the chain (browser, service worker, CDN edge, or — most often — the published deployment itself is older than the current code).
- The old `index.html` references chunk hashes that no longer exist on the CDN.
- A hard refresh of the *page* doesn't help if the stale `index.html` is being served from cache or is the actual published version.
- The Transactions route just happens to be one of the lazy chunks whose hash changed, so it's the one that 404s.

Other pages "work" because their chunks happened to already be loaded into memory before navigating, or their hashes didn't change.

## Fix

Two parts:

### 1. Make `safeLazy` self-heal on chunk-load failures (code change)

Update the `safeLazy` wrapper in `src/App.tsx` so that when a dynamic import fails with a "Failed to fetch dynamically imported module" / "error loading dynamically imported module" / `ChunkLoadError`, it:

- Sets a one-shot sentinel in `sessionStorage` (e.g. `lovable:chunk-reload`) so we don't infinite-loop.
- Calls `window.location.reload()` to fetch a fresh `index.html` (which references the current chunk hashes).
- Only falls through to the existing red "Failed to load page" screen when the sentinel is already set (i.e. the reload already happened and the chunk is still missing — a genuine failure).

This way, after any future publish, users self-heal silently instead of staring at the red error.

### 2. Republish the app

After the code change lands, republish so buildersuiteml.com serves the new `index.html` + matching chunks. I'll prompt you with the Publish action when the change is in.

## Technical detail

Pseudo-shape for the wrapper (final code will preserve the existing fallback UI):

```ts
const CHUNK_RELOAD_KEY = "lovable:chunk-reload";

function isChunkLoadError(err: unknown) {
  const msg = String((err as any)?.message || err);
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|ChunkLoadError|Importing a module script failed/i.test(msg);
}

function safeLazy(factory) {
  return lazy(() =>
    factory().catch((err) => {
      if (isChunkLoadError(err) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
        window.location.reload();
        return { default: () => null }; // brief blank during reload
      }
      // existing red fallback UI...
    })
  );
}
```

A small effect at app boot clears `CHUNK_RELOAD_KEY` on a successful render so the self-heal arms again for the next deploy.

## Files touched

- `src/App.tsx` — update `safeLazy`, add a tiny boot effect to clear the sentinel on success.

No other files, no schema changes, no business-logic changes.