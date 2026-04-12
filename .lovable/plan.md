

## Show Checkout as Dialog Instead of Separate Page

### The Problem
When a user clicks "Subscribe Monthly" or "Subscribe Annual", the entire screen replaces with a checkout page that has a "Back" button. The user navigates away from the "Subscription Required" screen. You want the checkout to appear as a dialog overlay so the user stays on the same page, and on success, the page simply refreshes into the app.

### Solution
Wrap the `CheckoutForm` in a `Dialog` component instead of rendering it as a full-page replacement. When the user clicks a subscribe button, open the dialog with the two-column checkout form inside it. On successful subscription, close the dialog and invalidate queries so the gate re-evaluates and lets them through.

### Changes

**`src/components/SubscriptionGate.tsx`**

1. Import `Dialog`, `DialogContent` from `@/components/ui/dialog`
2. Change `checkout` state to control dialog open/close
3. Move the `Elements` + `CheckoutForm` render into a `<Dialog>` that overlays the "Subscription Required" screen
4. Remove the full-page layout from `CheckoutForm` (the `min-h-screen`, back button, outer container) — keep only the two-column card content
5. Remove the `onBack` prop; replace with `onClose` to close the dialog
6. On successful subscription, close dialog + invalidate queries (existing behavior handles the refresh)

### Layout
The "Subscription Required" page stays visible behind the dialog. The dialog contains the compact two-column checkout (order summary left, card form right) at roughly the same size as now (~700px max width).

### Files
1. **Edit**: `src/components/SubscriptionGate.tsx` — wrap checkout in Dialog instead of full-page swap

