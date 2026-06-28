## Pricing page — two tiers on top, real modules grid below, fully crawlable

### 1. Rewrite `src/pages/Pricing.tsx`

Layout top → bottom:

1. **Hero**
   - H1: "Simple, Honest Pricing"
   - Subhead: "Start free with up to 3 projects. Scale to unlimited at $39 per user / month."

2. **Two pricing cards (side-by-side)** — short, no long feature lists inside the cards
   - **Free** — $0 / month — "Up to 3 projects. Full access to every module. No credit card required." → CTA: "Start Free"
   - **Pro** — $39 / user / month — "Unlimited projects. Everything in Free. Priority support." → CTA: "Start Pro Trial". Marked as recommended.
   - Removes the old 3-tier cards, "Most Popular" badge, the path-selection modal, and all the fake bullets ("Email support", "API access", "SSO", etc.).

3. **"Everything included on both plans" section — module grid BELOW the pricing cards**
   Replaces the fake feature bullets that used to live inside the tier cards. Each module is its own card with an icon, name, and one-line description, using only real BuilderSuite ML modules:
   - Projects, Budgets & Job Costing
   - Construction Accounting (A/P, A/R, Banking, Reconciliation, Reports)
   - AI Bill Management (bulk PDF upload, extraction, PO matching)
   - Smart Gantt Scheduling (predecessors, sub confirmations, templates)
   - Bid Management (packages, side-by-side comparison, auto-PO)
   - Purchase Orders & Vendor Management
   - Document & Photo Management (folder access control)
   - Team & Subcontractor Communication
   - Subcontractor Marketplace (built-in)
   - Reports & Dashboards
   - Multi-user with role-based permissions
   - Apartments / Rentals module

4. **Trust strip**: cancel anytime, no setup fees, free onboarding help.

Wrapped in `<PublicHeader />` / `<PublicFooter />` and `<SeoHead>` with pricing-specific title/description; canonical and og:url self-reference `https://buildersuiteml.com/pricing`.

### 2. Add `/pricing` to `scripts/prerender-marketing.mjs`

Append a `/pricing` entry to `ROUTES` so postbuild emits `dist/pricing/index.html` with static, crawler-readable HTML mirroring the page order above:
- title: "Pricing — Free for 3 Projects, then $39 / User / Month | BuilderSuite ML"
- description: "Start free with up to 3 projects. Scale to unlimited at $39 per user / month. Full access to every BuilderSuite ML module on both plans."
- h1: "Simple, Honest Pricing"
- intro: Free (3 projects) + Pro ($39/user/mo)
- sections (in order): "Free Plan", "Pro Plan", then one h2 per major module group mirroring the on-page module grid
- cta → `/auth?tab=signup`
- ogImage: reuse `/og/home.jpg`

Add `/pricing` to the prerenderer's `FOOTER_LINKS` so every prerendered footer links to it.

### 3. Add `/pricing` to `scripts/generate-sitemap.ts`

Insert `{ path: "/pricing", changefreq: "monthly", priority: "0.9" }` in the `entries` array.

### Out of scope
- No backend, no Stripe wiring, no plan-gating logic.
- No changes to `App.tsx` routes, `PublicHeader`, or `PublicFooter` (already wired).
- No new OG image — reuse existing `/og/home.jpg`.

### Technical notes
- Prerenderer runs in `postbuild`, writes `dist/{route}/index.html` with a static body that mirrors the React page. Crawlers (incl. non-JS social previewers) get full HTML; React hydrates on top with no mismatch because `createRoot` discards `#root` children on mount.
- The in-page `<SeoHead>` is still used at runtime for JS-executing crawlers and SPA navigation.
