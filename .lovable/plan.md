

## Three Fixes for Manage Subscription Dialog and Invoice Receipt

### Changes

**1. Widen the dialog** (`ManageSubscriptionDialog.tsx`, line ~233)
- Change `max-w-lg` to `max-w-2xl` on the `DialogContent` to eliminate the horizontal scrollbar.

**2. Fix invoice receipt: logo color and remove URL** (`ManageSubscriptionDialog.tsx`, lines 108-205)
- Change `.company` color from `#2563eb` (blue) to `#1a1a1a` (black).
- Add a `@media print` CSS block that hides the browser's automatic URL footer. While browsers control this, we can encourage suppression with `@page { margin: 0.5in; }` and add a print-specific style. Also set the iframe to use `about:blank` base to avoid the Lovable URL showing.

### Files to modify
1. `src/components/settings/ManageSubscriptionDialog.tsx`
   - Line ~233: `max-w-lg` → `max-w-2xl`
   - Line 117: `.company` color `#2563eb` → `#1a1a1a`
   - Add `@page { margin: 0.5in; }` and `@media print` styles to suppress browser header/footer URLs in the receipt HTML template

