### Goal
Restructure the paid-tier layout on the Subscription settings page so the top three cards sit on one row and Invoice History occupies the second row.

### Current Layout
- Row 1: Current Plan | Payment Method  (2-column grid)
- Row 2: Billing Information             (drops to next row in the 2-col grid)
- Row 3: Invoice History                 (full-width below)

### Proposed Layout
- Row 1: Current Plan | Payment Method | Billing Information  (3-column grid)
- Row 2: Invoice History                                           (full-width below)

### Changes
1. **File: `src/components/settings/SubscriptionTab.tsx`**
   - Change the grid from `grid-cols-1 lg:grid-cols-2` to `grid-cols-1 lg:grid-cols-3`.
   - Remove `auto-rows-fr` (no longer needed since all three cards are in the same single row).
   - Keep the Invoice History section as a full-width block below the grid.
   - All panel content (Current Plan, Payment Method, Billing Information, Invoice History) remains unchanged.

### Out of Scope
- No changes to free-tier layout.
- No changes to billing logic, Stripe interactions, or edge functions.