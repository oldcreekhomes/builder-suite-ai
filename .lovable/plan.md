## Install Google Tag Manager `GTM-WXBXKC6Z`

### Changes to `index.html`

**1. Remove** lines 42–86 (all placeholder pixel scripts in `<head>`): GA4/gtag, Google Ads, Meta Pixel, LinkedIn Insight. None of them have real IDs anyway — they're all `XXXX` placeholders, so removing them changes zero current tracking.

**2. Remove** lines 90–98 (LinkedIn + Meta `<noscript>` fallbacks in `<body>`).

**3. Add** the GTM head snippet in `<head>` (placed high, right after viewport):
```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WXBXKC6Z');</script>
<!-- End Google Tag Manager -->
```

**4. Add** the GTM noscript fallback immediately after `<body>` (Lovable rule: noscript pixels in body, never head):
```html
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WXBXKC6Z"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

### Out of scope
- No consent banner / Consent Mode (per your call).
- No GA4/Ads/Meta/LinkedIn tags re-added — you'll configure those inside the GTM container UI.
- No other file changes.

### After deploy
Verify with GTM Preview mode or the Tag Assistant Chrome extension on `buildersuiteml.com`.
