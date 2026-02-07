

## Insurance Certificate Viewing in Edit Company Dialog

### Current Situation

The "View Certificate" button in the Insurance tab currently:
1. Fetches the most recent **completed** certificate upload from the `pending_insurance_uploads` table
2. Opens it using `window.open()` with a signed URL
3. Shows the single certificate PDF that was uploaded (which contains all 4 coverage types)

**Why it might appear non-functional:**
- The button is disabled when there's no completed certificate upload
- The `window.open()` call may be blocked by popup blockers in some contexts

### Recommended Solution

Since all 4 coverage types (Commercial General Liability, Automobile Liability, Umbrella Liability, Worker's Compensation) come from the **same** Certificate of Insurance PDF, the cleanest UX is:

**Add a clickable PDF icon in a new "Policy" column** that opens the certificate in the universal file preview modal (consistent with how other files are previewed throughout the app).

### Implementation Steps

**Step 1 - Add UniversalFilePreviewProvider to Companies page**

File: `src/pages/Companies.tsx`

Wrap the page content with `UniversalFilePreviewProvider` so the file preview modal is available.

**Step 2 - Add helper function to useUniversalFilePreview hook**

File: `src/hooks/useUniversalFilePreview.ts`

Add a new `openInsuranceCertificate` function for the `insurance-certificates` bucket.

**Step 3 - Expose the new function in the provider**

File: `src/components/files/UniversalFilePreviewProvider.tsx`

Add `openInsuranceCertificate` to the context type and value.

**Step 4 - Update InsuranceContent to show Policy column with clickable PDF icon**

File: `src/components/companies/CompanyInsuranceSection.tsx`

Changes:
- Import `useUniversalFilePreviewContext` and `FileText` icon
- Add a "Policy" column to the table header (between "Status" and the edge, or as a new first/last column)
- For each coverage row, display a PDF icon that:
  - Is clickable when a certificate exists
  - Opens the certificate in the FilePreviewModal when clicked
  - Is grayed out or hidden when no certificate exists
- Keep the "View Certificate" button as a secondary option (or remove it since the icon provides the same functionality)

### Visual Changes

The insurance table will change from:

| Coverage Type | Policy # | Carrier | Expiration | Status |
|---|---|---|---|---|

To:

| Coverage Type | Policy # | Carrier | Expiration | Status | Policy |
|---|---|---|---|---|---|
| Commercial General Liability | Q61-... | Erie Insurance... | 12/31/26 | Current | 📄 (clickable PDF icon) |

All 4 rows will have the same PDF icon since they all come from the same certificate.

### Technical Details

- The certificate PDF is stored in the `insurance-certificates` bucket
- The file path is in `pending_insurance_uploads.file_path` (e.g., `21bfaa14-0a39-4416-9309-e02b0db3750e/1766956272894.pdf`)
- The certificate query already exists and fetches the latest completed upload
- Using the universal preview system ensures consistent behavior (zoom, download, no popup blocking)

### Files to Change

1. `src/pages/Companies.tsx` - Wrap with UniversalFilePreviewProvider
2. `src/hooks/useUniversalFilePreview.ts` - Add openInsuranceCertificate function
3. `src/components/files/UniversalFilePreviewProvider.tsx` - Expose new function
4. `src/components/companies/CompanyInsuranceSection.tsx` - Add Policy column with PDF icon

