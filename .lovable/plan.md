# Replace Lovable favicon with BuilderSuite ML logo

## Steps

1. Copy `public/buildersuiteml-logo.png` → `public/favicon.png`.
2. Delete `public/favicon.ico` (browsers auto-request it and it would override).
3. Update `index.html` line 7 from `<link rel="icon" href="/favicon.ico" type="image/x-icon">` to `<link rel="icon" href="/favicon.png" type="image/png">`.

## Note

The browser tab caches favicons aggressively — a hard refresh (or new tab) may be needed to see the change.
