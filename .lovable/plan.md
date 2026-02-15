
## Fix: Scroll to Top on Page Navigation

**Problem**: When navigating between public pages (e.g., Home to Our Philosophy), the scroll position carries over from the previous page instead of resetting to the top.

**Solution**: Add a small `ScrollToTop` component inside the `BrowserRouter` in `src/App.tsx` that listens for route changes and calls `window.scrollTo(0, 0)` on every navigation.

### Changes

**New file: `src/components/ScrollToTop.tsx`**
- A simple component that uses `useLocation()` from React Router and a `useEffect` to scroll to the top of the window whenever the pathname changes.

**Modified file: `src/App.tsx`**
- Import and render `<ScrollToTop />` right after `<BrowserRouter>` (before `<Routes>`), so it fires on every route change across the entire app.

This is a standard React Router pattern -- one small component, one import, and the bug is fixed globally for all pages.
