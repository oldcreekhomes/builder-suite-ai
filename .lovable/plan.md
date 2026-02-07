

# Features Submenu & Accounting Feature Page

## Overview
Create a dropdown submenu under "Features" in the public header, and build an Accounting feature page as the template for future feature pages. The Accounting page will follow the Landing page's structure with a hero section and alternating left-right feature rows.

## Current State
- **PublicHeader.tsx**: "Features" is a button that scrolls to `#features` section on the landing page
- **Landing.tsx**: Has 6 FeatureRow components with alternating layouts
- **FeatureRow component**: Already supports `reversed` prop for left/right alternation and `className` for alternating background colors
- **Existing images**: 6 feature images already in `/public/images/`

## Proposed Changes

### 1. Update PublicHeader with Features Dropdown Menu

Transform "Features" from a simple button to a dropdown menu with submenu items:

| Menu Item | Route |
|-----------|-------|
| Accounting | `/features/accounting` |
| AI Bill Management | `/features/ai-bill-management` |
| Bid Management | `/features/bid-management` |
| Document Management | `/features/document-management` |
| Gantt Scheduling | `/features/gantt-scheduling` |
| Team Communication | `/features/team-communication` |

The dropdown will use Radix UI's NavigationMenu or a simple hover dropdown for clean UX.

### 2. Create Accounting Feature Page Template

**Route**: `/features/accounting`

**Page Structure**:

```text
+------------------------------------------+
|         PublicHeader (shared)            |
+------------------------------------------+
|                                          |
|    HERO SECTION (bg-gradient)            |
|    "ACCOUNTING" label                    |
|    "Streamlined Financial Management"    |
|    Subtitle text                         |
|    [Sign Up] button                      |
|    + Hero image on right                 |
+------------------------------------------+
|                                          |
|    FEATURE ROW 1 (bg-muted/30)           |
|    Image LEFT | Text RIGHT               |
|    "Built-In General Ledger"             |
+------------------------------------------+
|                                          |
|    FEATURE ROW 2 (bg-background)         |
|    Text LEFT | Image RIGHT               |
|    "AI-Powered Bill Entry"               |
+------------------------------------------+
|                                          |
|    FEATURE ROW 3 (bg-muted/30)           |
|    Image LEFT | Text RIGHT               |
|    "Cost Code Tracking"                  |
+------------------------------------------+
|                                          |
|    FEATURE ROW 4 (bg-background)         |
|    Text LEFT | Image RIGHT               |
|    "Vendor Management"                   |
+------------------------------------------+
|                                          |
|    FOOTER (shared pattern)               |
+------------------------------------------+
```

### 3. Create Shared PublicFooter Component

Extract the footer pattern from Landing.tsx and AboutUs.tsx into a reusable component for consistency across all public pages:

- Logo and branding
- Navigation links (Home, Our Philosophy, Sign In)
- Tagline and copyright

### 4. Update App.tsx Routes

Add new route for the Accounting feature page:
```tsx
<Route path="/features/accounting" element={<FeatureAccounting />} />
```

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/PublicHeader.tsx` | Modify | Add dropdown submenu for Features |
| `src/components/PublicFooter.tsx` | Create | Shared footer component |
| `src/pages/features/Accounting.tsx` | Create | Accounting feature page (template) |
| `src/pages/Landing.tsx` | Modify | Use PublicFooter component |
| `src/pages/AboutUs.tsx` | Modify | Use PublicFooter component |
| `src/App.tsx` | Modify | Add route for `/features/accounting` |

## Technical Details

### Features Dropdown Implementation

Use a simple CSS-based hover dropdown or NavigationMenu from Radix UI (already installed):

```tsx
// Dropdown structure in PublicHeader
<div className="relative group">
  <button className="...">Features</button>
  <div className="absolute hidden group-hover:block ...">
    <Link to="/features/accounting">Accounting</Link>
    <Link to="/features/ai-bill-management">AI Bill Management</Link>
    <!-- more items -->
  </div>
</div>
```

### Feature Page Template Pattern

The Accounting page will establish a reusable pattern:
1. Import `PublicHeader` and `PublicFooter`
2. Hero section with gradient background
3. Multiple `FeatureRow` components with alternating `reversed` and `className` props
4. Path selection modal (same as Landing page)

### Content Structure for Accounting Page

**Hero Section**:
- Label: "ACCOUNTING"
- Title: "Streamlined Financial Management"
- Description: "No more QuickBooks. No more integration headaches. Accounting is built right into BuilderSuite, keeping everything consolidated in one system."
- Image: Use existing `/images/accounting-bills-preview.png`

**Feature Rows** (4 alternating rows):

1. **Built-In General Ledger** (Image Left)
   - Full double-entry accounting without external software

2. **AI-Powered Bill Entry** (Image Right)
   - Scan and extract bill data automatically

3. **Cost Code Tracking** (Image Left)
   - Track costs against budget by category

4. **Vendor Management** (Image Right)
   - Manage all vendor relationships and payments

## Future Expandability

Once this template is approved and built, it can be quickly duplicated for:
- AI Bill Management page (`/features/ai-bill-management`)
- Bid Management page (`/features/bid-management`)
- Document Management page (`/features/document-management`)
- Gantt Scheduling page (`/features/gantt-scheduling`)
- Team Communication page (`/features/team-communication`)

Each page follows the same structure, just with different hero content and feature row content specific to that feature.

