## Plan: Pricing Page

### Overview
Build a standalone `/pricing` page using the pricing data already defined in `Landing.tsx`, wire it into the marketing site navigation (`PublicHeader`), and register the route in `App.tsx`.

### Deliverables
1. **New page: `src/pages/Pricing.tsx`**
   - Reuses the three pricing tiers (Starter $99/mo, Professional $249/mo, Enterprise Custom) from `Landing.tsx`.
   - Wrapped with `<SeoHead>` (title/meta) and the standard `<PublicHeader>` / `<PublicFooter>` layout.
   - Clean, focused layout with plan cards, feature lists, and CTAs.
   - Uses existing site styling (shadcn/ui Card, Button, etc.). No hardcoded colors.

2. **Route registration in `src/App.tsx`**
   - Add `const Pricing = safeLazy(() => import("./pages/Pricing"));`
   - Add `<Route path="/pricing" element={<Pricing />} />` in the public routes block (outside `SidebarLayout`).

3. **Navigation update in `src/components/PublicHeader.tsx`**
   - Add a plain text link "Pricing" immediately to the right of the "For Subcontractors" dropdown in the `hidden md:flex` nav bar.
   - Link routes to `/pricing`.

4. **Footer update in `src/components/PublicFooter.tsx`**
   - Add a "Pricing" link to the footer link row.

### Out of scope
- Changing any existing pricing amounts or plan details (reuses Landing.tsx data).
- Adding backend logic or checkout integration (presentation only).
- Mobile hamburger menu (PublicHeader currently has no mobile menu; no change needed).