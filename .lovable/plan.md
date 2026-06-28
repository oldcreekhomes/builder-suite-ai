## Goal

Replace every fake/AI-generated OG share image in `public/og/` with real screenshots of the actual running BuilderSuiteML app, each branded with a small `BuilderSuiteML` wordmark overlay. The Facebook preview (and every other social share) will then show the real product, not a stock-looking mockup.

In scope: the 9 OG images only (`public/og/*.jpg`) — `home`, `accounting`, `ai-bill-management`, `bid-management`, `document-management`, `gantt-scheduling`, `join-marketplace`, `team-communication`, `about`. Marketing page in-body images and blog covers are NOT touched in this pass.

## How

1. **Confirm live app session.** Check `LOVABLE_BROWSER_AUTH_STATUS`. If not `injected`, stop and ask you to sign in to the preview so I can capture authenticated screens.

2. **Capture real screens via Playwright** against `localhost:8080` with `viewport=1280x800` (matches 1.91:1 OG ratio closely; I'll then crop/pad to exactly 1200×630). One script under `/tmp/browser/og-shots/` drives the browser through:
   - `home` → Project Dashboard (`/`) showing real projects list / dashboard cards
   - `accounting` → `/accounting` (Reports or Bank Register page)
   - `ai-bill-management` → `/accounting` Bills tab or `/review-bills`
   - `bid-management` → a project's Bidding page
   - `gantt-scheduling` → a project's Schedule (Gantt) page
   - `document-management` → a project's Files page
   - `team-communication` → `/messages`
   - `join-marketplace` → public `/marketplace-signup` (no auth needed)
   - `about` → public `/about` hero
   
   Each capture waits for content to render (`networkidle` + a key selector), then `page.screenshot({ path })`.

3. **Compose the final OG image** with Python + Pillow for each capture:
   - Canvas: exactly 1200×630, brand background color (matches site bg).
   - Place the screenshot centered, scaled to fit with ~40px padding, subtle rounded corners + soft shadow (clean, not the heavy mac-frame product-shot look you didn't pick).
   - Overlay a small `BuilderSuiteML` wordmark bottom-left (text, using the site's font weight 700, ~28px), and a tiny page label bottom-right (e.g. "Smart Gantt Scheduling"). No fake browser chrome, no stock photos.
   - Export as JPEG quality 85 → write directly to `public/og/<name>.jpg`, overwriting the existing fake file. Same filenames means no code/meta changes needed — every `<SeoHead>` and prerender script keeps working.

4. **QA each output.** View every generated JPG, check: real UI is legible, no PII leaking (I'll prefer pages without client names where possible, or use a demo project), wordmark not overlapping content, dimensions exactly 1200×630.

5. **Tell you to refresh the FB/LinkedIn debugger** — social platforms cache the old image; the new one won't show on already-shared links until you re-scrape via Facebook's Sharing Debugger / LinkedIn Post Inspector.

## Out of scope (call out for a follow-up pass if you want)

- Hero/feature images embedded inside `/`, `/about`, `/features/*`, `/vs/buildertrend`, `/pricing` page bodies.
- Blog post cover images in `content/blog/*`.
- `buildersuiteml-logo.png` / `founder-photo.png` in `src/assets/`.
- Any prerendered HTML `<img>` references — none need updating since filenames are reused.

## Technical notes

- No new dependencies; Pillow + Playwright are already in the sandbox.
- No app code changes, no SEO tag changes, no sitemap changes.
- Screenshots will use whichever tenant your injected Supabase session belongs to; I'll prefer demo-looking projects and avoid screens with sensitive financial detail. If a screen looks too sensitive, I'll swap in a different module's view and tell you.
- If `LOVABLE_BROWSER_AUTH_STATUS` is `external_unmanaged` or `signed_out`, I'll only be able to redo the 2 public-page OGs (`about`, `join-marketplace`) and will ask you for screenshots of the rest.
