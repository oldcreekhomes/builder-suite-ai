

## Fix: Auth Page Content Stuck to the Left

### Root Cause

The `SidebarProvider` in `App.tsx` wraps **all** routes, including `/auth`. This provider renders a sidebar layout container that takes up space on the left side of the screen, pushing the Auth page content (including the "Check Your Email" card) to the left instead of centering it.

This is the same root cause that has been creating this problem repeatedly -- it's not a CSS issue on the Auth page itself, it's the parent layout.

### Fix

**Move the Auth route (and other non-authenticated routes) outside the `SidebarProvider`** in `App.tsx`:

1. Restructure `App.tsx` so that public/auth routes (`/auth`, `/reset-password`, `/landing`, `/about`, feature pages, shared routes, bid routes, etc.) render **outside** the `SidebarProvider`
2. Only wrap the protected/dashboard routes inside the `SidebarProvider`

This way the Auth page's `min-h-screen flex items-center justify-center` will work correctly against the full viewport width with no sidebar container interfering.

### Technical Detail

In `App.tsx`, the current structure is:

```text
SidebarProvider (adds sidebar layout to ALL routes)
  Routes
    /auth  <-- gets sidebar layout, card shifts left
    /project/...  <-- correctly gets sidebar
```

The fix changes it to:

```text
Routes
  /auth  <-- no sidebar, centers correctly
  SidebarProvider
    /project/...  <-- correctly gets sidebar
```

Only one file changes: `src/App.tsx`.
