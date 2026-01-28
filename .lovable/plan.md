
Goal
- Make shared links (YouTube, Google, and other external sites) reliably open from chat without showing “is blocked / ERR_BLOCKED_BY_RESPONSE”, in both Preview and Published.

What’s happening (in plain terms)
- Clicking the link from inside the app opens a new tab that is still “connected” to the app’s tab (the “opener” relationship).
- Some major sites (YouTube/Google and others) enforce strict security headers that can block tabs opened from certain embedded/sandboxed contexts when an opener relationship exists, resulting in ERR_BLOCKED_BY_RESPONSE.
- Copy/paste works because it’s a direct navigation with no opener relationship at all.

Why the current fix didn’t fully work
- We currently do: window.open(href, '_blank', 'noopener,noreferrer')
- In some environments/browsers/embedded contexts, the “noopener” feature string is not consistently honored, so the opener relationship can still exist. That’s why you still get blocked pages even after switching from <a> to window.open().

Implementation approach (robust opener-null technique)
- Replace the current window.open(href, ...) call with a more reliable “open blank tab first, then detach opener, then navigate” technique:
  1) Open about:blank in a new tab synchronously from the click (ensures popup blockers allow it).
  2) Immediately set newWindow.opener = null (hard detach).
  3) Set newWindow.location.href = href.
- Add fallbacks:
  - If window.open returns null (popup blocked), fall back to window.location.assign(href) (still opens, but in same tab).
  - Wrap navigation in try/catch and fall back to window.open(href, '_blank') if needed.

Files to change
- src/lib/linkify.tsx

Detailed code changes (high level)
1) Add a small helper inside src/lib/linkify.tsx, e.g. safeOpenExternal(href: string)
   - Behavior:
     - const w = window.open('about:blank', '_blank');
     - if (!w) { window.location.assign(href); return; }
     - try { w.opener = null; } catch {}
     - try { w.location.href = href; } catch { window.open(href, '_blank'); }
     - try { w.focus?.(); } catch {}
2) Update link click + keyboard handlers to call safeOpenExternal(href) instead of window.open(...)
3) Keep existing stopPropagation/preventDefault so clicking a link doesn’t trigger parent click handlers (important in message rows/cards).
4) Verify link parsing behavior stays the same (http/https/www) and styling stays underlined.

Verification steps
- In Preview:
  - Send a message containing:
    - https://youtube.com/shorts/s5OfhzbjuTs?si=IcZUC8Ov0fHP3NVe
    - https://www.google.com
    - Another non-Google site you previously saw blocked
  - Click each link and confirm it opens normally (no blocked page).
- In Published:
  - Repeat the same test from the Published URL.
- Keyboard accessibility:
  - Tab to the link and press Enter/Space; confirm it opens.

Edge cases considered
- Popup blockers: Opening about:blank directly on click keeps it as a user gesture; if blocked anyway, we fall back to same-tab navigation.
- Browser differences: Explicitly nulling opener is broadly effective even when the “noopener” feature string is ignored.
- Message UI behavior: stopPropagation/preventDefault prevent the chat row from hijacking the click.

Success criteria
- Clicking external links from chat opens the destination normally (no ERR_BLOCKED_BY_RESPONSE) in both Preview and Published, including YouTube Shorts and Google links.
