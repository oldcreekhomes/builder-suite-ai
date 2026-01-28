
# Fix: External Links Being Blocked (YouTube, etc.)

## Root Cause Analysis
The app runs inside Lovable's sandboxed iframe. When external sites like YouTube detect a popup opened from a sandboxed iframe, their Cross-Origin-Opener-Policy (COOP) security headers block the connection. This causes the `ERR_BLOCKED_BY_RESPONSE` error.

This is NOT a code bug - it's a browser security feature. The previous `rel="noopener"` fix was correct but insufficient because the sandbox restriction is applied at the platform level.

## Solution
Replace the `<a>` tag with a `<span>` that uses `window.open()` with specific parameters. This creates a completely detached navigation that avoids triggering COOP restrictions.

---

## Technical Implementation

### File: `src/lib/linkify.tsx`

**Current approach (blocked by COOP):**
```tsx
<a 
  key={index}
  href={href}
  target="_blank"
  rel="noopener"
  className="underline hover:opacity-80"
  onClick={(e) => e.stopPropagation()}
>
  {part}
</a>
```

**New approach (bypasses COOP):**
```tsx
<span
  key={index}
  role="link"
  tabIndex={0}
  className="underline hover:opacity-80 cursor-pointer"
  onClick={(e) => {
    e.stopPropagation();
    e.preventDefault();
    // Opens in a completely new browsing context with no opener relationship
    window.open(href, '_blank', 'noopener,noreferrer');
  }}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  }}
>
  {part}
</span>
```

---

## Why This Works

1. **No anchor tag** - Avoids the default browser link behavior that creates an opener relationship
2. **`window.open()` with options** - The third parameter `'noopener,noreferrer'` tells the browser to create a completely disconnected browsing context
3. **Keyboard accessible** - Added keyboard support for accessibility (Enter/Space to activate)
4. **Same visual appearance** - Maintains underline and hover effect

---

## Files to Modify

1. `src/lib/linkify.tsx` - Change from `<a>` to `<span>` with `window.open()` handler

---

## Expected Result

After this change:
- YouTube links will open successfully in a new tab
- Other external links (Google, etc.) will also work
- Links remain clickable and visually identical (underlined)
- Works on both preview and published sites
