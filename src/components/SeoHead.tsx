import { Helmet } from "react-helmet-async";

const SITE = "https://buildersuiteml.com";
const DEFAULT_OG = `${SITE}/dashboard-preview.png`;

interface SeoHeadProps {
  title: string;
  description: string;
  path: string;
  ogType?: "website" | "article";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Per-route head tags. Helmet replaces the static <meta> values from
 * index.html for JS-executing crawlers, while the static og:* fallback
 * in index.html remains for non-JS social previewers.
 */
export function SeoHead({ title, description, path, ogType = "website", jsonLd }: SeoHeadProps) {
  const url = `${SITE}${path}`;
  const ld = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : null;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={DEFAULT_OG} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={DEFAULT_OG} />
      {ld?.map((obj, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(obj)}
        </script>
      ))}
    </Helmet>
  );
}
