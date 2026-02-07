
# Create Document Management Feature Page

## Overview
Create a new feature page for "Document Management" at `/features/document-management` following the exact template structure as the other feature pages. The navigation already includes Document Management in the Features dropdown, and the preview image already exists.

## Page Structure

### Hero Section
- **Label**: "DOCUMENT MANAGEMENT"
- **Headline**: "All Your Project Files in One Place"
- **Description**: Focus on eliminating the chaos of Dropbox, Google Drive, and scattered file systems - everything lives with the project

### Feature Rows (4 rows, alternating layout)

| Row | Label | Title | Key Message |
|-----|-------|-------|-------------|
| 1 | PROJECT-CENTERED STORAGE | Files Belong to Projects, Not Folders | Unlike Dropbox or Google Drive where you hunt through folder hierarchies, BuilderSuite organizes files by project automatically. Plans, specs, contracts, and photos all live where they belong - with the job. |
| 2 | NO MORE APP SWITCHING | Ditch the External File Services | Stop paying for Dropbox, Google Drive, or Box. BuilderSuite includes unlimited project storage so your documents, photos, and drawings are all in one platform - no more switching between apps. |
| 3 | SHARE INSTANTLY | Send Files Without Downloading First | Share any file or folder with a single link. Subcontractors, clients, and architects get immediate access without creating accounts or installing apps - just click and view. |
| 4 | BUILT-IN ORGANIZATION | Folders, Versions, and Search | Create folder structures that make sense for construction. Track document versions, search across all projects, and never lose a file in an email attachment again. |

### CTA Section
- Headline: "Ready to Consolidate Your Project Files?"
- Subtitle encouraging signup
- Light gray gradient background (matching other pages)

## File Changes

### New File: `src/pages/features/DocumentManagement.tsx`
Create a new page following the exact structure of GanttScheduling.tsx and BidManagement.tsx:
- Same imports (useState, useNavigate, icons, components)
- PublicHeader with path modal handler
- Hero section with proper gradient and layout
- 4 FeatureRow components with `expandableImage={true}` and `showPathModal={true}`
- Alternating backgrounds (bg-muted/30 and bg-background)
- CTA section with gray gradient
- PublicFooter
- Path selection modal (Home Builder vs Subcontractor)

### Update: `src/App.tsx`
Add import and route:

1. Add import after existing feature imports (~line 39):
```tsx
import FeatureDocumentManagement from "./pages/features/DocumentManagement";
```

2. Add route after existing feature routes (~line 89):
```tsx
<Route path="/features/document-management" element={<FeatureDocumentManagement />} />
```

## Key Value Propositions to Highlight

1. **No More Tool Sprawl** - Eliminate Dropbox, Google Drive, Box subscriptions
2. **Project-First Organization** - Files automatically organized by job, not arbitrary folders
3. **Zero-Friction Sharing** - Links work without accounts or downloads
4. **Construction-Ready** - Built for plans, specs, photos, and contracts
5. **Unlimited Storage** - No per-seat storage limits to worry about

## Image Usage
All feature rows will use the existing `/images/document-management-preview.png` image.
