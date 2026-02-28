

## Fix Marketplace Page Header Alignment

### Problem
The Marketplace page uses a custom inline header with a `Store` icon, `text-3xl` font, and description baked into the header bar itself. This is completely different from every other page in the app, which uses the shared `CompanyDashboardHeader` component for the top bar and places page titles/descriptions in the content area below.

### Solution
Restructure the Marketplace page to match the standard used by Manage Bills, Transactions, and all other pages:

1. Replace the custom header block with `<CompanyDashboardHeader title="Marketplace" />`
2. Move the page description ("Discover top-rated contractors...") into the content area below as a standard `text-2xl font-bold` title + `text-muted-foreground` subheading block

### File change: `src/pages/Marketplace.tsx`

**Remove** (lines 76-86): The custom header with `Store` icon, `text-3xl`, and inline description.

**Replace with**:
- `<CompanyDashboardHeader title="Marketplace" />` as the header (matches exact geometry of all other pages)
- Standard title block inside the content area:
  ```
  <h1 className="text-2xl font-bold">Marketplace</h1>
  <p className="text-muted-foreground">Discover top-rated contractors...</p>
  ```

This gives the Marketplace page the same header bar height, border alignment, sidebar trigger position, and content-area title pattern as Manage Bills, Settings, Company Dashboard, and every other page.

