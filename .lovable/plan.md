## Improve GTM installation quality

Google's "Improve your Tag Manager installation" guidance (the page you linked) flags two things:

1. The GTM `<script>` should be placed **as high as possible in `<head>`** — ideally right after the opening `<head>` / charset / viewport, before any other scripts or large metadata blocks.
2. The GTM `<noscript>` should be placed **immediately after the opening `<body>` tag**, before any other markup.

Right now in `index.html`:
- The GTM script sits at lines ~42–48, *after* all OG/Twitter meta tags and two `application/ld+json` blocks. Those JSON-LD blocks delay GTM discovery.
- The GTM `<noscript>` is already directly after `<body>` — good, no change.

### Change

**`index.html` `<head>`** — move the GTM `<script>` block up so it sits immediately after `<meta name="viewport">` (and the favicon `<link>`), **before** the `<title>`, description, author, verification, OG, Twitter, and JSON-LD blocks. Everything else in `<head>` stays in the same relative order, just shifted down.

**`index.html` `<body>`** — no change. The noscript iframe stays as the first child of `<body>`.

### Out of scope
- No change to the GTM container ID (`GTM-WXBXKC6Z`).
- No consent mode / banner.
- No other files touched.

### After deploy
Re-run the Tag Assistant / GTM install quality check on `buildersuiteml.com` — the "placement" warning should clear.
