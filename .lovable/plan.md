

## Phase II: Stamp Proposal PDFs in the Send PO Edge Function

### What happens now
When "Send PO" is clicked, the `send-po-email` edge function fetches proposal files from `project_bids.proposals`, generates public URLs (lines 610-613), and includes them as download links in the email. The PDFs are sent unmodified.

### What changes
After fetching proposal files (~line 610) and before generating the email, each PDF proposal will be:
1. Downloaded from Supabase storage as binary
2. Stamped on every page using `pdf-lib` with the same green "APPROVED" stamp (matching the preview)
3. Re-uploaded to `project-files/proposals/approved/[filename]`
4. The email links updated to point to the stamped versions

Original files remain untouched.

### Implementation details

**File**: `supabase/functions/send-po-email/index.ts`

**1. Add import at top:**
```typescript
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';
```

**2. Add stamping function:**
```typescript
async function stampProposalPDF(
  pdfBytes: Uint8Array,
  managerName: string,
  approvalDate: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const page of pdfDoc.getPages()) {
    const { width } = page.getSize();
    // Draw green bordered stamp at top-right of each page
    // "APPROVED" in bold green, manager name italic, date below
    // Matching the CSS preview: green dashed border, rotated -5deg
  }
  return pdfDoc.save();
}
```

**3. Insert stamping step after line 616 (after proposal URLs are built), before the email is generated:**
- Skip stamping if `isCancellation` is true
- For each proposal file: fetch bytes → stamp → upload to `proposals/approved/` → replace URL in `proposalFiles` array
- The project manager name is already available in `projectManager.name` (line 439)
- Date formatted as MM/DD/YYYY

**4. No other files change** — the client-side preview (Phase I) remains as-is.

### Stamp visual design (matching the preview)
- Green dashed border rectangle
- "APPROVED" in bold green text (large)
- Project Manager name below (signature style)
- Date below that
- Top-right corner of each page with margin
- Slight rotation for stamp authenticity

