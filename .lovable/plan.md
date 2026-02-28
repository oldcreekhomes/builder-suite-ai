
## Fix Manage Bills Page: Button Styling and Layout Alignment

### Problem
1. The "Upload PDFs" button uses the default filled/dark variant instead of matching the Files page buttons (`variant="outline" size="sm"`).
2. The "Bill Actions" sidebar header is pushed down by `pt-3` on the parent container, causing it to misalign with the Menus/Messages tabs.
3. The content area (Extracted Bills card) top border doesn't align with the project dropdown.
4. A gap in the vertical border appears because the ContentSidebar doesn't extend to the very top of its container.

### Changes

**1. `src/components/bills/SimplifiedAIBillExtraction.tsx` (line ~807)**
- Change `<Button disabled={uploading} asChild>` to `<Button variant="outline" size="sm" disabled={uploading} asChild>`
- This makes "Upload PDFs" match the Files page buttons (white background, border, same font weight/size).

**2. `src/pages/ApproveBills.tsx` (line 27)**
- Remove `pt-3` from the content wrapper: change `className="flex flex-1 overflow-hidden pt-3"` to `className="flex flex-1 overflow-hidden"`
- This lifts the Bill Actions sidebar and content area up so the sidebar header aligns with Menus/Messages and the content aligns with the project dropdown. The ContentSidebar already has its own internal padding (`px-4 py-3`), so extra top padding is unnecessary and causes the misalignment.

### Result
- "Upload PDFs" button renders as an outlined button identical to "Choose Files", "Choose Folder", etc.
- "Bill Actions" sidebar header aligns horizontally with the Menus/Messages tabs.
- The vertical border on the ContentSidebar extends fully without gaps.
- Content top border aligns with the project dropdown.
