

## Fix Logo on Auth Pages to Match Homepage

The current `buildersuiteai-logo.png` file used on the auth pages is incorrect. The real BuilderSuite ML logo on your homepage (buildersuiteai.com) is not an image file -- it's a combination of the Building2 icon and styled "BuilderSuite ML" text, rendered in code inside `PublicHeader.tsx`.

### What needs to change

**1. Create a reusable Logo component (`src/components/Logo.tsx`)**
- Extract the logo markup from `PublicHeader.tsx` into a shared component
- Renders the Building2 icon + "BuilderSuite ML" styled text
- Accepts optional size/className props for flexibility
- Wraps in a `<Link to="/">` so it always navigates home

**2. Update Auth page (`src/pages/Auth.tsx`)**
- Remove the `buildersuiteai-logo.png` import
- Replace the `<img>` tag with the new `<Logo />` component
- Apply to both the main auth view and the "Check Your Email" success view

**3. Update Marketplace Signup (`src/pages/MarketplaceSignup.tsx`)**
- Same change: swap the PNG image for the `<Logo />` component
- Apply to both the form view and the success view

**4. Update PublicHeader (`src/components/PublicHeader.tsx`)**
- Use the new shared `<Logo />` component instead of inline markup

This ensures the logo is consistent everywhere and maintained in one place.

### Technical Details

The shared Logo component will look like:

```text
Building2 icon (h-8 w-8) + "BuilderSuite" text + circled "ML" subscript
```

Matching the exact styling from PublicHeader: `text-xl font-bold text-foreground tracking-tight` with the subscript styled as a circled badge.

No new dependencies needed. The `buildersuiteai-logo.png` file can remain in the assets folder but will no longer be imported on these pages.
