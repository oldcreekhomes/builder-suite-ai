

# Redesign Marketplace Signup to Match Auth Page Layout

## Problem
The Marketplace Signup page has a layout issue where:
- A custom header takes up space at the top
- The gray background (`bg-muted/30`) doesn't span the full viewport
- The content appears left-aligned with white space on the right
- The form card is not centered in the viewport

## Solution
Adopt the same clean, centered layout pattern used by the `/auth` page:
- Full-screen gray background (`bg-gray-50`)
- Card centered both horizontally and vertically using flexbox
- Remove the custom header (keep "Back to Home" link within the form area)
- Use tabs to switch between "Sign In" and "Join Marketplace" views

## File to Change

### `src/pages/MarketplaceSignup.tsx`

Replace the current layout structure with the Auth page's centered pattern:

**Current Layout:**
```tsx
<div className="min-h-screen bg-muted/30 flex flex-col">
  <header>...</header>
  <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-12">
    <div className="text-center mb-8">...</div>
    <Card>...</Card>
  </main>
</div>
```

**New Layout (matching Auth page):**
```tsx
<div className="min-h-screen w-full flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div className="w-full max-w-md space-y-8">
    <div className="text-center">
      <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
        Join the BuilderSuite Marketplace
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Get listed where home builders can find you
      </p>
    </div>
    <Card className="w-full">
      <!-- Form content -->
    </Card>
    <div className="text-center">
      <Link to="/" className="text-sm text-primary hover:underline">
        Back to Home
      </Link>
    </div>
  </div>
</div>
```

## Visual Result
- Gray background (`bg-gray-50`) spans the entire viewport
- Title "Join the BuilderSuite Marketplace" centered at top
- Form card perfectly centered horizontally and vertically
- "Back to Home" link below the card
- Matches the visual style of the `/auth` page exactly
- Mobile-responsive with proper padding

## Technical Details
- Replace the outer container classes to use `flex items-center justify-center`
- Remove the custom `<header>` element entirely
- Change `max-w-2xl` to `max-w-md` to match Auth page width
- Move "Back to Home" link to below the card
- Keep all form fields and submission logic unchanged

