
# Plan: Fix YouTube Links Being Blocked

## Problem
When clicking on YouTube links in chat messages, the page shows "youtube.com is blocked" with error `ERR_BLOCKED_BY_RESPONSE`. This happens because the current code includes `rel="noreferrer"` which strips the referrer header from the request. YouTube blocks requests that don't include a referrer for security/tracking reasons.

## Root Cause
In `src/lib/linkify.tsx`, the link has:
```tsx
rel="noopener noreferrer"
```

The `noreferrer` part tells the browser not to send the referrer header to the destination site. YouTube (and some other sites) reject these requests.

## Solution
Change the `rel` attribute from `"noopener noreferrer"` to just `"noopener"`:

```tsx
rel="noopener"
```

This:
- **Keeps security**: `noopener` prevents the opened page from accessing `window.opener` (the main security concern)
- **Allows referrer**: The referrer header will be sent, which YouTube needs to accept the request
- **Matches Facebook behavior**: This is how most link sharing works on social platforms

## Technical Change

### File: `src/lib/linkify.tsx`

**Current code (line 19):**
```tsx
rel="noopener noreferrer"
```

**New code:**
```tsx
rel="noopener"
```

## Result
- YouTube links will open correctly
- All other external links will work the same way
- Security is maintained via `noopener`

## File to Modify
- `src/lib/linkify.tsx` (1 line change)
