## What Claude told you (and what's actually true)

The marketing site at `buildersuiteml.com` is a React single-page app (Vite + React Router). The server only ships this static HTML body:

```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

Everything else — hero copy, feature rows, footer — is built in the browser by JavaScript. Per-page `<title>` / meta tags are also injected client-side via react-helmet-async.

- **Googlebot:** does execute JS, so it *can* index the pages, but it's slower, flakier, and per-page titles/descriptions sometimes don't get picked up.
- **Bing, LinkedIn, Slack, Facebook, X/Twitter, ChatGPT, Perplexity, and most AI crawlers:** do NOT execute JS. They see a blank page with the homepage's title and description, no matter which URL they hit.

So Claude is essentially right. The fix is **prerendering**: at build time, render each public marketing page to a real HTML file with all the copy and per-page meta tags baked in. The app still hydrates into a normal SPA after load — users see no difference, but crawlers get fully-readable HTML.

## Scope (what I will and won't touch)

**Will prerender these 9 public marketing routes only:**
- `/`
- `/about`
- `/features/accounting`
- `/features/ai-bill-management`
- `/features/gantt-scheduling`
- `/features/bid-management`
- `/features/document-management`
- `/features/team-communication`
- `/features/join-marketplace`

**Will NOT touch:**
- Anything inside the app (`/dashboard`, `/projects/*`, `/accounting/*`, `/settings`, etc.)
- Auth pages (`/auth`, `/auth/marketplace`, `/password-reset`)
- Any business logic, hooks, components used by the app
- Any Supabase function or backend code

The app continues to work exactly as it does today. Only the build step changes for those 9 marketing URLs.

## Per-page Open Graph images

Right now every page shares one OG image (`dashboard-preview.png`), so LinkedIn/X previews look generic. I'll generate one branded 1200×630 OG image per marketing route — 9 total — themed to the page (e.g. AI Bill Management gets a bill-extraction visual, Gantt Scheduling gets a Gantt visual, etc.). Each page's `SeoHead` then points `og:image` and `twitter:image` at its own image, so social previews are page-specific.

Files: written under `public/og/` (e.g. `public/og/ai-bill-management.png`) so they're served as plain static assets at `https://buildersuiteml.com/og/ai-bill-management.png`. `SeoHead.tsx` gets an optional `ogImage` prop; each marketing page passes its image path. The sitewide fallback in `index.html` stays as is.

Note: after deploy, LinkedIn/Slack/Facebook cache the old image. You'll need to refresh each URL once in their respective debuggers (LinkedIn Post Inspector, Facebook Sharing Debugger, X Card Validator) to force a re-scrape. I'll list the debugger URLs in the closing message.

## How prerendering works (technical section)

1. Add `@prerenderer/rollup-plugin` + `@prerenderer/renderer-puppeteer` to devDependencies.
2. Wire it into `vite.config.ts` so it runs only on `vite build` (not dev). After Vite produces `dist/`, the plugin boots a headless Chromium, navigates to each of the 9 routes against the built bundle, waits for React + react-helmet-async to finish, and writes the fully-rendered HTML to `dist/about/index.html`, `dist/features/accounting/index.html`, etc.
3. Lovable's SPA fallback already serves `index.html` for unknown paths, so the prerendered files are served first when they exist and the SPA fallback handles everything else. React then hydrates on top — no visual flicker, no behavior change for logged-in users.
4. `main.tsx` switches from `createRoot(...).render(...)` to a small branch: if `#root` already has children (prerendered), call `hydrateRoot`; otherwise `createRoot().render()` as today. ~4-line change.
5. No change to react-helmet-async usage. The prerenderer captures whatever Helmet has injected into `<head>` at snapshot time, so each page ships with its correct title, description, canonical, og:* (including the new per-page og:image), and JSON-LD in the static HTML.
6. No change to `robots.txt` or `sitemap.xml` (already correct).

## What you'll be able to verify after deploy

- `curl https://buildersuiteml.com/features/accounting` returns HTML containing the page's hero copy and page-specific `<title>` / `<meta description>` / `<meta og:image>`, instead of an empty `<div id="root">`.
- LinkedIn / Slack / X link previews show the correct per-page title, description, AND image (after one-time debugger refresh per URL).
- Google Search Console "View crawled page" shows the rendered HTML directly, no JS rendering step needed.

## Risk / rollback

Low risk — the change is build-time only and isolated to 9 URLs plus 9 new image files. If anything looks off after deploy, removing the plugin from `vite.config.ts` reverts HTML to today's behavior in one edit; the OG images are harmless static files.