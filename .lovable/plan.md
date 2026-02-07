

# Consistent Public Header Navigation

## Overview
Create a unified, consistent header component for all public-facing pages (Landing, About Us, and future pages). The header will have a clear three-section layout with centered navigation.

## Current State
- **Landing.tsx** (lines 157-175): Logo left, "Sign In", "Our Philosophy", "Get Started" all on the right
- **AboutUs.tsx** (lines 28-46): Logo left, "Sign In", "Home", "Get Started" all on the right
- No shared header component exists - each page has its own inline implementation

## Proposed Layout

```text
+-----------------------------------------------------------------------------------+
|  [Logo] BuilderSuite     |   Home   Our Philosophy   Features   |   Sign In  [Get Started]  |
+-----------------------------------------------------------------------------------+
     LEFT                              CENTER                              RIGHT
```

- **Left**: BuilderSuite logo with icon (links to home)
- **Center**: Navigation links - Home, Our Philosophy, Features
- **Right**: Sign In (text button) + Get Started (primary button)

## Implementation Steps

### Step 1: Create Shared PublicHeader Component
Create a new component at `src/components/PublicHeader.tsx` that includes:
- Logo and branding on the left (clickable, links to "/")
- Centered navigation with three links: Home, Our Philosophy, Features
- Right-aligned actions: Sign In link and Get Started button
- The "Features" link will scroll to features section on Landing page (can be configured to link to a dedicated features page later if needed)
- Responsive design with proper spacing

### Step 2: Update Landing.tsx
- Remove the inline header code (lines 156-175)
- Import and use the new `PublicHeader` component
- Pass the modal open handler for "Get Started" button

### Step 3: Update AboutUs.tsx
- Remove the inline header code (lines 27-46)
- Import and use the new `PublicHeader` component
- Pass the modal open handler for "Get Started" button

---

## Technical Details

### PublicHeader Component Props
```tsx
interface PublicHeaderProps {
  onGetStartedClick: () => void;
}
```

### Navigation Structure
| Link | Route/Action |
|------|--------------|
| Home | `/` |
| Our Philosophy | `/about` |
| Features | `/#features` (scroll to features section on Landing) |
| Sign In | `/auth` |
| Get Started | Opens path selection modal (passed via prop) |

### Styling Approach
- Use flexbox with `justify-between` for the three sections
- Center section uses `flex-1` and `justify-center`
- Consistent styling matching current design (sticky header, border-bottom, same colors)
- Mobile considerations: May need responsive hamburger menu in future (not in current scope)

