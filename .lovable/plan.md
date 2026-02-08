

# Split Navigation: "For Builders" and "For Subcontractors"

## Overview
Replace the single "Features" dropdown with two separate dropdowns that clearly differentiate content for Home Builders vs. Subcontractors. This aligns with the two-path signup strategy and helps visitors immediately understand which content is relevant to them.

## Current Navigation Structure
```
Home | Our Philosophy | Features ▼ | Sign In | Get Started
                          └── Accounting
                          └── AI Bill Management
                          └── Smart Gantt Scheduling
                          └── Bid Management
                          └── Document Management
                          └── Team Communication
```

## New Navigation Structure
```
Home | Our Philosophy | For Builders ▼ | For Subcontractors ▼ | Sign In | Get Started
                            │                    │
                            │                    └── Join the Marketplace
                            │
                            └── Accounting
                            └── AI Bill Management
                            └── Smart Gantt Scheduling
                            └── Bid Management
                            └── Document Management
                            └── Team Communication
```

## Files to Change

### 1. Update: `src/components/PublicHeader.tsx`

**Changes:**
- Replace single `featureMenuItems` array with two arrays:
  - `builderFeatures` - existing 6 feature pages
  - `subcontractorFeatures` - starting with "Join the Marketplace"
- Replace single "Features" dropdown with two dropdowns:
  - "For Builders" with HardHat icon
  - "For Subcontractors" with Handshake icon
- Each dropdown maintains existing styling (min-w-240px, proper z-index, solid background)

### 2. Create: `src/pages/features/JoinMarketplace.tsx`

**New subcontractor feature page following the established template:**
- **Hero Section**: 
  - Label: "FOR SUBCONTRACTORS"
  - Headline: "Get Found by Home Builders"
  - Description: Focus on visibility in the BuilderSuite Marketplace directory
- **Feature Rows** (4 rows, alternating layout):
  1. **FREE LISTING** - "Your Business in Front of Builders" - Get listed in the directory at no cost
  2. **VERIFIED PROFILE** - "Build Trust Before the First Call" - Showcase insurance, licenses, portfolio
  3. **DIRECT CONNECTIONS** - "Builders Come to You" - No cold calling, receive opportunities directly
  4. **ZERO FRICTION** - "Respond Without Apps" - No downloads, respond to bids and schedules via email
- **CTA Section**: "Ready to Get More Work?" with button linking to `/auth/marketplace`

### 3. Update: `src/App.tsx`

**Add route:**
```tsx
import FeatureJoinMarketplace from "./pages/features/JoinMarketplace";
// ...
<Route path="/features/join-marketplace" element={<FeatureJoinMarketplace />} />
```

## Visual Design

The two dropdowns will use subtle icons to reinforce the distinction:
- **For Builders**: HardHat icon (matches existing path modal)
- **For Subcontractors**: Handshake icon (matches existing path modal)

Both dropdowns maintain the same styling as the current Features dropdown for visual consistency.

## Technical Details

### PublicHeader Component Updates

```tsx
// Two separate feature arrays
const builderFeatures = [
  { label: "Accounting", route: "/features/accounting" },
  { label: "AI Bill Management", route: "/features/ai-bill-management" },
  { label: "Smart Gantt Scheduling", route: "/features/gantt-scheduling" },
  { label: "Bid Management", route: "/features/bid-management" },
  { label: "Document Management", route: "/features/document-management" },
  { label: "Team Communication", route: "/features/team-communication" },
];

const subcontractorFeatures = [
  { label: "Join the Marketplace", route: "/features/join-marketplace" },
];
```

### JoinMarketplace.tsx Structure

Will follow the exact template established by other feature pages:
- Same imports (useState, useNavigate, icons, components)
- PublicHeader with path modal handler
- Hero section with gradient `from-muted` to `to-background`
- 4 FeatureRow components with `expandableImage={true}`
- Alternating backgrounds: `bg-muted/30` → `bg-background` → `bg-muted/30` → `bg-background`
- CTA section with gray gradient
- PublicFooter
- Path selection modal (though this page primarily targets subcontractors)

### Image Assets

Will use a placeholder or existing marketplace-related image. You may want to provide a specific screenshot for the Join Marketplace page later.

