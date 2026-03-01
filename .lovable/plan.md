

## Add Drag-and-Drop Zone to "Enter with AI" Tab

### Problem
The "Enter with AI" tab only has a small "Upload PDFs" button in the header. There's no visual indication that drag-and-drop is supported, and in fact it currently isn't -- unlike the Photos page which has an obvious dropzone.

### Complexity Assessment
**Very low.** `react-dropzone` is already installed. The upload logic already exists in `SimplifiedAIBillExtraction`. We just need to surface a dropzone in the content area.

### Approach
Rather than restructuring the extraction component, add a `useDropzone` hook directly in `BillsApprovalTabs.tsx` for the upload tab's empty state area. When files are dropped, programmatically trigger the same file input that the header "Upload PDFs" button uses.

### Changes

**`src/components/bills/BillsApprovalTabs.tsx`**

1. Import `useDropzone` from `react-dropzone`.
2. Add a ref to the `SimplifiedAIBillExtraction` component (or its hidden file input) so we can trigger uploads programmatically from dropped files. Alternatively, since `SimplifiedAIBillExtraction` already renders a hidden `<input type="file">`, we can add an `onFilesDropped` prop or expose a ref.
3. Replace the plain empty state div (lines 803-806) with a styled dropzone matching the Photos page pattern:
   - Upload icon
   - "Upload bills by dragging and dropping here" heading
   - "Drag and drop PDF files here, or use the Upload PDFs button above" description
   - "Supports: PDF" note
   - Card with subtle border, highlight on drag-over

**`src/components/bills/SimplifiedAIBillExtraction.tsx`**

1. Add a `forwardRef` pattern (like PhotoUploadDropzone) exposing a `dropFiles(files: File[])` method.
2. The `dropFiles` method creates a synthetic event or directly calls the upload logic from `handleFileUpload`, bypassing the file input element.

### Technical Detail

The `SimplifiedAIBillExtraction` component will be updated to:
```
export interface SimplifiedAIBillExtractionHandle {
  dropFiles: (files: File[]) => void;
}
```

The parent (`BillsApprovalTabs`) will hold a ref to it and pass dropped files through. The dropzone in the content area will use `useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] } })`.

### Result
- The empty state shows a clear drag-and-drop zone (consistent with Photos page style)
- When bills are present (table showing), the dropzone is replaced by the table (users use the header button for additional uploads)
- When extracting, the existing loading state shows as before
- Zero new dependencies, minimal code addition

