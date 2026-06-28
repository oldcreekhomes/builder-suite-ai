## Verify buildersuiteml.com and finish Search Console setup

Assuming you've published so the meta tag is live on buildersuiteml.com:

1. **Call Google's verify endpoint** for `https://buildersuiteml.com/` (META method). If it fails with `failedToFindMetaTag`, stop and tell you the deploy isn't live yet.
2. **Add the verified site** as a Search Console property (PUT `/webmasters/v3/sites/...`).
3. **Submit the sitemap** `https://buildersuiteml.com/sitemap.xml` (PUT `/webmasters/v3/sites/.../sitemaps/...`).
4. **Run an SEO scan** on the project and report findings.

No code changes — the meta tag is already in `index.html` from the previous step.
