
## Re-stating the issue (so we fix the right thing)
- Clicking external links (YouTube, Google, and others) from inside the app opens a new tab that shows a blocked page (`ERR_BLOCKED_BY_RESPONSE`).
- Copy/pasting the exact same URL into a new tab works.
- This happens in both development (preview) and production.

## Do I know what the issue is?
Not with certainty yet, but the repeated failures strongly suggest this is not “opener/referrer” anymore. The most likely cause is that the browser/platform is still treating the new tab as being opened from a restricted context (embedded/sandboxed/isolated browsing context group), and some destinations will block navigations that originate from that context. The key difference with copy/paste is that it creates a completely fresh top-level navigation initiated from the address bar, not from a popup chain.

## Strategy: Stop navigating directly to external sites from the click tab
Instead of trying more variations of `window.open(...)`, we’ll route all outbound clicks through a first-party “redirect trampoline” page on our own domain, opened in a new tab, and then perform the external navigation from there.

This pattern is used widely because:
- The new tab is first opened to our own origin (so no COOP/CORP weirdness on first load).
- That page can immediately detach from the opener and then navigate using `location.replace()`.
- We can add robust fallbacks (meta refresh + a visible “Click to continue” button) if the browser blocks script-based navigation.

## Implementation plan (code changes)

### 1) Add a dedicated outbound redirect route/page
Create a new page, e.g.:
- `src/pages/OutboundRedirect.tsx`

Behavior:
- Reads a query param like `?u=<encodedUrl>`
- Validates the URL:
  - must be `http:` or `https:`
  - optional: block `javascript:`/`data:` explicitly
- Immediately executes:
  - `try { window.opener = null; } catch {}`
  - `window.location.replace(targetUrl)`
- Renders fallback UI:
  - “Opening link…”
  - A normal `<a href={targetUrl} target="_self" rel="noreferrer">Continue</a>` button
  - A “Copy link” button using `navigator.clipboard.writeText(targetUrl)` (in case the browser still blocks automatic redirect)

Why the fallback UI matters:
- If any browser blocks automatic redirect, the user can still click the “Continue” button inside the new tab (this often succeeds even when the original click-to-external fails).
- It also gives a graceful escape hatch without requiring manual copy/paste.

### 2) Wire the route into the router
In `src/App.tsx`, add a route that does not require auth (so it works everywhere):
- `Route path="/out" element={<OutboundRedirect />}`

### 3) Centralize outbound link opening in one helper
Add a helper function (new file recommended) e.g.:
- `src/lib/openExternal.ts`

`openExternal(url: string)` will:
1) Build `const outUrl = \`/out?u=\${encodeURIComponent(url)}\`;`
2) Try opening the outbound redirect page:
   - Prefer an anchor “programmatic click” approach (often treated closest to a real user click):
     - create `<a href={outUrl} target="_blank" rel="noopener">` append, click, remove
   - Fallback: `window.open(outUrl, "_blank")`
3) If popup is blocked:
   - `window.location.assign(outUrl)` (same-tab fallback, last resort)

### 4) Update `linkifyText` to use the outbound redirect instead of direct navigation
In `src/lib/linkify.tsx`:
- Replace `safeOpenExternal(href)` usage with `openExternal(href)` (the centralized helper)
- Keep the same `<span role="link" tabIndex=0>` accessibility approach

Important: we will **stop** attempting to open YouTube/Google directly from the click handler. We only open `/out?...` in the new tab.

### 5) Update other places that open external URLs
Search and replace patterns like:
- `window.open(url, '_blank')`
- direct clickable images/attachments that call `window.open`

For example:
- `src/components/messages/SimpleMessagesList.tsx` has `window.open(url, '_blank')` for attachments.
We’ll route those through `openExternal(url)` too, so attachments don’t suffer the same block.

### 6) Add lightweight diagnostics (temporary)
To confirm what’s happening in real browsers:
- Add console logs around:
  - whether popup creation succeeded
  - the computed `/out?...` URL
  - whether redirect page received the correct URL
These can be removed once confirmed fixed.

## Why this should work (practical reasoning)
- The new tab initially loads a page from *your* domain, not YouTube/Google.
- The redirect happens from a clean top-level context, and we can do it with `location.replace()` (most compatible).
- If automatic navigation is blocked, the user clicks “Continue” in the new tab, which typically bypasses the popup-chain restrictions (it’s now a direct interaction in that tab).

## Testing checklist (we will do these after implementation)

### In Preview (dev)
1) Send a chat message with:
   - `https://youtube.com/shorts/s5OfhzbjuTs?si=IcZUC8Ov0fHP3NVe`
   - `https://www.google.com`
   - 1–2 other sites you know were blocked
2) Click each:
   - Expect: a new tab opens to `/out?...`, then forwards to the external site.
   - If forwarding fails: the `/out` page shows “Continue” button; clicking it should work.
3) Test keyboard:
   - Tab to link, press Enter.

### In Published (prod)
Repeat the same tests.

## Security considerations
- This introduces an “outbound redirect” endpoint. Even though it’s client-side, we will:
  - Strictly validate scheme is http/https
  - Render the destination visibly so users can see where they’re going
  - Avoid executing arbitrary protocols

## Expected outcome
- External links opened from messages reliably reach their destination.
- If a browser still blocks auto-forwarding, the user will be one click away (Continue) inside the newly opened tab, rather than being stuck on an unhelpful blocked page.

## If this still fails
At that point, it likely means the user’s browser or an extension/policy is blocking scripted redirects or new-tab navigation from the app domain. If so, we’ll implement an “Open in new tab” overlay that:
- copies the link automatically
- provides a big “Open YouTube” button that opens in the same tab (not a popup)
- optionally uses a user-confirmed modal to satisfy stricter popup heuristics

Reference for deeper troubleshooting:
https://docs.lovable.dev/tips-tricks/troubleshooting
