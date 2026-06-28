## Add a static blog and publish the Buildertrend comparison as the first post

You're right — a `/vs/buildertrend` page is fine, but a real blog with proper article markup ranks better and gives us a home for future SEO content. And to be truly crawler-friendly, posts should ship as real HTML in the page source — not React that renders after JS runs.

We already have the pattern for this: `scripts/prerender-marketing.mjs` rewrites `dist/index.html` into per-route static HTML at build time. We'll extend it for blog posts so every post ships as fully-rendered HTML (title, headings, paragraphs, links, JSON-LD) before any JS runs. Crawlers see the whole article; users still get the SPA after hydration.

### What we'll build

1. **Blog content folder** — `content/blog/*.md` (one Markdown file per post, with frontmatter for title/description/date/tags/og image).
2. **Build-time loader** — small helper that reads every Markdown file, parses frontmatter, and renders Markdown → HTML using `marked` (tiny, no React).
3. **Blog index page** `/blog` — lists every post with title, date, excerpt, link. Prerendered, SEO-friendly, real `<a href>` links.
4. **Blog post page** `/blog/:slug` — renders the post's HTML. Includes proper `<article>`, `<h1>`, semantic markup, Article JSON-LD, BreadcrumbList JSON-LD, canonical, og:type=article, published/modified dates.
5. **Prerender extension** — `scripts/prerender-marketing.mjs` discovers the Markdown files and writes `dist/blog/index.html` + `dist/blog/<slug>/index.html` with the full article body baked in (the SPA still hydrates after).
6. **First post** — `content/blog/buildersuite-ml-vs-buildertrend.md`, adapted from the `/vs/buildertrend` page (long-form, headings, comparison table, FAQ). The standalone `/vs/buildertrend` route stays and links to the blog post (and vice versa) so the comparison page keeps its keyword targeting while the blog version captures share/article traffic.
7. **Sitemap + nav** — `scripts/generate-sitemap.ts` adds `/blog` plus one entry per post; `PublicHeader` / `PublicFooter` get a "Blog" link.

### Why this is genuinely SEO-friendly (no-JS)

- Every blog URL serves static HTML at first byte — title, meta description, canonical, og:*, Article JSON-LD, and the **full article text** are in `view-source:` before any JS executes.
- Googlebot, Bingbot, social previewers, and LLM crawlers (which often don't run JS) see the whole post.
- The React SPA still mounts on top for in-app navigation — same pattern as the existing marketing pages.

### Technical details

- **Dependencies:** add `marked` (Markdown → HTML, ~30KB build-time only, not shipped to browser) and `gray-matter` (frontmatter parser). Both are dev-only.
- **Markdown frontmatter shape:**
  ```yaml
  ---
  title: BuilderSuite ML vs. Buildertrend — The Built-by-Builders Alternative
  description: A side-by-side look at native double-entry accounting, AI bill capture, and what it costs to switch from Buildertrend.
  date: 2026-06-28
  author: BuilderSuite ML Team
  tags: [comparison, buildertrend, accounting]
  ogImage: /og/home.jpg
  ---
  ```
- **Routes:**
  - `/blog` → `src/pages/blog/BlogIndex.tsx`
  - `/blog/:slug` → `src/pages/blog/BlogPost.tsx`
  - Both pages read a build-generated `src/generated/blog-manifest.ts` (slug → metadata + rendered HTML) so client-side rendering matches what the prerenderer baked in.
- **Manifest generator:** runs in `predev` and `prebuild` alongside the existing sitemap script; writes `src/generated/blog-manifest.ts` from `content/blog/*.md`.
- **Prerender:** `scripts/prerender-marketing.mjs` iterates the manifest and writes `dist/blog/<slug>/index.html` with the post body, JSON-LD, canonical, and og:* per post.
- **JSON-LD per post:** `Article` (headline, datePublished, author, image) + `BreadcrumbList` (Home → Blog → Post).
- **Canonical + og:url** self-reference each post URL (e.g. `https://buildersuiteml.com/blog/buildersuite-ml-vs-buildertrend`).
- **Internal linking:**
  - `/vs/buildertrend` adds a link to the blog post.
  - The blog post links back to `/vs/buildertrend` and to relevant feature pages (`/features/accounting`, `/features/ai-bill-management`).

### About the "I can't see it" preview issue

The `/vs/buildertrend` page exists in code but the published site hasn't been redeployed since I added it — that's why it's not visible in preview/published yet. Frontend changes go live when you click **Publish → Update** in the publish dialog. The blog plan above will land in the same publish step, so one publish will surface both the blog and the vs page.

### Out of scope (ask if you want them)

- CMS / database-backed posts (current plan is Markdown-in-repo, which is fastest to ship and zero-cost)
- Author profile pages, tag archive pages, RSS feed (easy follow-ups once the bones are in)
- Per-post custom og:image generation