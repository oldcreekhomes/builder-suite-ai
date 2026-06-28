## Execute Google Search Console setup for buildersuiteml.com

### Steps

1. **Connect the Google Search Console connector** — trigger OAuth so the gateway has access on your Google Workspace account.

2. **Request a META verification token** from the Site Verification API for `https://buildersuiteml.com/`.

3. **Add the token to `index.html`** as a single line in `<head>`:
   ```html
   <meta name="google-site-verification" content="<TOKEN>" />
   ```

4. **Pause for you to publish.** The tag must be live on buildersuiteml.com before Google can verify. I'll stop and wait for your confirmation.

5. **After you confirm published**, call Google's `verify` endpoint, then add the verified site to your Search Console property list.

6. **Submit the sitemap** (`https://buildersuiteml.com/sitemap.xml`) to Google.

7. **Run an SEO scan** on the project and fix any critical findings it surfaces.

### Notes
- The meta tag stays in `index.html` permanently — Google rechecks periodically.
- No DNS changes, no email setup (you said skip that).
- Only `index.html` gets edited; no app code changes.
