## Add tracking + remarketing pixels to buildersuiteml.com

Install four scripts site-wide so you can see visitors and remarket to them on Google/YouTube, Facebook/Instagram, and LinkedIn.

### What gets installed

1. **Google Analytics 4 (GA4)** — traffic analytics (sessions, sources, pages, conversions).
2. **Google Ads remarketing tag** — builds audiences for Google Search/Display/YouTube retargeting.
3. **Meta Pixel** — builds audiences for Facebook/Instagram retargeting.
4. **LinkedIn Insight Tag** — builds audiences for LinkedIn retargeting (strong for B2B builders).

All four fire immediately on every page (no consent banner, per your choice).

### Where the code goes

Single edit to `index.html` — add the four `<script>` snippets near the end of `<head>`, plus the LinkedIn `<noscript><img></noscript>` fallback at the top of `<body>` (per HTML5 rules, noscript img can't sit in head).

Because the site is a React SPA, I'll also add a tiny route-change listener in `src/App.tsx` that fires a virtual pageview on each client-side navigation for GA4, Meta (`PageView`), and LinkedIn — otherwise only the initial load gets tracked.

### Placeholder IDs to swap later

I'll drop in obvious placeholders so the wiring is correct and you can find/replace once you have the real IDs:

- `G-XXXXXXXXXX` — GA4 Measurement ID
- `AW-XXXXXXXXXX` — Google Ads Conversion ID
- `XXXXXXXXXXXXXXX` — Meta Pixel ID (15-digit)
- `XXXXXXX` — LinkedIn Partner ID

### Where to get each ID

- **GA4**: analytics.google.com → Admin → Data Streams → Web → Measurement ID
- **Google Ads**: ads.google.com → Tools → Audience Manager → Your data sources → Google Ads tag
- **Meta Pixel**: business.facebook.com → Events Manager → Data Sources → Pixel ID
- **LinkedIn**: linkedin.com/campaignmanager → Analyze → Insight Tag → Partner ID

### Things to know

- Pixels fire on every page including `/blog/*`, so retargeting pools will include blog readers.
- No cookie banner — fine for US traffic; not GDPR-compliant for EU visitors. Add one later if you start running EU ads.
- Privacy policy should mention these trackers; happy to draft one as a follow-up.

### Files touched

- `index.html` — add 4 script blocks + LinkedIn noscript pixel
- `src/App.tsx` — add SPA route-change listener that pings GA4, Meta, LinkedIn on navigation
