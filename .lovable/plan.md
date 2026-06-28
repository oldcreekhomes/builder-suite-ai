## Goal

Replace all 9 fake AI-generated OG/social-share images in `public/og/*.jpg` with clean, on-brand images built from your real brand assets (`src/assets/buildersuiteml-logo.png` + project's near-black/white color tokens). No fake screenshots, no fake "BuilderSuite ML" graphics with stock dashboards, no AI mockups. Same filenames, so no SeoHead, prerender script, or sitemap changes are needed — the new files just overwrite the old.

The body of the marketing pages (Landing, AboutUs, /features/*, /pricing, /vs/buildertrend) already only references the real founder photo (Matt Gray's avatar) and shadcn UI — there are no fake in-page images to replace. Scope is the OG images only.

## What each OG image will look like

1200×630 JPG, monochrome on-brand:
- Background: near-black (`hsl(240 10% 3.9%)`, the dark-mode `--background`).
- Real `BuilderSuiteML` logo (from `src/assets/buildersuiteml-logo.png`) top-left at ~64px height.
- Large page-specific headline centered-left, e.g. "Construction Accounting", "Smart Gantt Scheduling", "AI Bill Management", set in Montserrat Bold ~76px in white.
- One-line subhead below in muted gray ~28px, page-specific (e.g. "Double-entry accounting built for home builders").
- `buildersuiteml.com` wordmark bottom-left in small caps.
- Subtle accent: a thin top border bar in the brand foreground white. No gradients-with-stars, no fake UI screenshots, no rendered phones.

This matches the actual app's visual language (mono palette, Montserrat-family type, restrained) rather than the stock AI aesthetic.

## How

1. **Generate via Pillow script** at `/tmp/og/build_og.py`:
   - Load `src/assets/buildersuiteml-logo.png`, resize proportionally to 64px tall.
   - Download Montserrat Bold + Regular `.ttf` from the `@fontsource/montserrat` paths under `node_modules` if present, otherwise pull from Google Fonts static URL (one-time, into `/tmp/og/fonts/`).
   - Render each of 9 canvases with the per-page copy table below, write JPG quality 88 to `public/og/<name>.jpg`.

2. **Per-page copy table** (headline / subhead):
   - `home.jpg` → "Construction Management, Built for Builders" / "Projects, budgets, accounting, AI bills, Gantt — one platform."
   - `about.jpg` → "Built by Builders" / "Why Old Creek Homes built BuilderSuiteML."
   - `accounting.jpg` → "Construction Accounting" / "Double-entry, banking, reconciliation, reports."
   - `ai-bill-management.jpg` → "AI Bill Management" / "Auto-extract vendor, cost code, and amount."
   - `bid-management.jpg` → "Bid Management" / "Send packages, collect responses, convert to POs."
   - `document-management.jpg` → "Document Management" / "Project files, photos, folders, shareable links."
   - `gantt-scheduling.jpg` → "Smart Gantt Scheduling" / "Crews, vendors, predecessors — visual schedules."
   - `join-marketplace.jpg` → "Join the Marketplace" / "Get found by local home builders."
   - `team-communication.jpg` → "Team Communication" / "Chat for owners, employees, and trade partners."

3. **QA**: open every generated JPG with `code--view`, confirm logo is crisp (no blur from upscaling), text fits within margins, colors match the site, dimensions exactly 1200×630. Fix and re-run if any look off.

4. **Tell you to refresh the FB Sharing Debugger / LinkedIn Post Inspector** — Facebook caches the old image; new shares pick up the new file automatically but already-shared URLs need a re-scrape.

## Out of scope

- Marketing page body images (none are fake — already use the real Matt Gray photo).
- Blog cover images in `content/blog/*` (you didn't ask, and they're a separate authored set).
- `founder-photo.png` (real photo of Matt Gray, untouched).
- `buildersuiteml-logo.png` (your real logo, used as input).
- No code changes, no SEO tag changes, no new dependencies in the app — Pillow script runs in the sandbox only.

## Technical notes

- If `buildersuiteml-logo.png` is dark-on-transparent, I'll auto-invert it for the dark background so it reads as white-on-black. I'll inspect it first and decide.
- If the logo file is actually a wordmark with bundled name, I won't add the wordmark text again — only the bottom-left `buildersuiteml.com` URL line.
