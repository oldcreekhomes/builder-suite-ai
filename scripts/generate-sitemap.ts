// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://buildersuiteml.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Pull blog slugs from the generated manifest. The blog-manifest script runs
// immediately before this one (see predev/prebuild in package.json).
function blogEntries(): SitemapEntry[] {
  const manifestPath = resolve("src/generated/blog-manifest.ts");
  if (!existsSync(manifestPath)) return [];
  const src = readFileSync(manifestPath, "utf8");
  // Extract every "slug": "value" pair from the JSON-formatted constant.
  const slugRegex = /"slug":\s*"([^"]+)"/g;
  const dateRegex = /"date":\s*"([^"]+)"/g;
  const slugs: string[] = [];
  const dates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = slugRegex.exec(src))) slugs.push(m[1]);
  while ((m = dateRegex.exec(src))) dates.push(m[1]);
  return slugs.map((slug, i) => ({
    path: `/blog/${slug}`,
    lastmod: dates[i] ? dates[i].slice(0, 10) : undefined,
    changefreq: "monthly",
    priority: "0.6",
  }));
}

// Public, indexable marketing + entry routes. Excluded: /landing (redirects
// to /), /out (outbound redirect), /reset-password (utility, requires token),
// /submit-bid (requires bid_package_id query param), and all auth-gated app
// routes.
const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/auth", changefreq: "monthly", priority: "0.6" },
  { path: "/auth/marketplace", changefreq: "monthly", priority: "0.6" },
  { path: "/features/accounting", changefreq: "monthly", priority: "0.7" },
  { path: "/features/gantt-scheduling", changefreq: "monthly", priority: "0.7" },
  { path: "/features/ai-bill-management", changefreq: "monthly", priority: "0.7" },
  { path: "/features/bid-management", changefreq: "monthly", priority: "0.7" },
  { path: "/features/document-management", changefreq: "monthly", priority: "0.7" },
  { path: "/features/team-communication", changefreq: "monthly", priority: "0.7" },
  { path: "/features/join-marketplace", changefreq: "monthly", priority: "0.7" },
  { path: "/vs/buildertrend", changefreq: "monthly", priority: "0.8" },
];

function generateSitemap(items: SitemapEntry[]) {
  const urls = items.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
