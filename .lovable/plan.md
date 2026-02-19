

## Enhance Marketplace Row Click to Show Detailed Company Profile

### What Changes

When a user clicks on a row in the Marketplace table, a detailed company profile dialog will open showing:

1. **Company header** -- name, type badge, rating with stars, review count
2. **Contact information** -- phone number, website link, address
3. **Representatives section** -- full contact details for each rep (name, title, email, phone), with primary contact highlighted
4. **Description** (if available)
5. **Service areas and license numbers** (if available)
6. **Message button** -- opens the existing Send Message modal directly from the profile dialog

### How It Works

- Clicking anywhere on a table row (except the existing Website link or Message button) opens the `ViewMarketplaceCompanyDialog`
- The existing `ViewMarketplaceCompanyDialog` component already fetches representatives and displays most of this info -- it just needs a "Send Message" button added and needs to be wired into the table
- The Send Message modal will layer on top of the profile dialog

### Technical Details

**File: `src/components/marketplace/MarketplaceCompaniesTable.tsx`**
- Import `ViewMarketplaceCompanyDialog`
- Add state for `viewDialogOpen` and `viewCompany`
- Add `onClick` handler to each `TableRow` that sets the selected company and opens the view dialog
- Prevent click propagation on the Website link and Message button so they don't also trigger the row click
- Render `ViewMarketplaceCompanyDialog` alongside the existing `SendMarketplaceMessageModal`

**File: `src/components/marketplace/ViewMarketplaceCompanyDialog.tsx`**
- Add a "Send Message" button in the dialog (at the top or bottom of the content)
- Accept an `onMessageClick` callback prop that opens the message modal
- Pass the full company data (including `message_count`) so the dialog can display all relevant fields
- Update the `MarketplaceCompany` interface to include `message_count`, `lat`, `lng` fields to match the table's interface

No database or schema changes required -- representatives are already fetched by the existing dialog component.

