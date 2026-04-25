## Fix Attachments column in `CreatePurchaseOrderDialog.tsx`

### Problem
Right now the 80px "Click or drag to upload" dropzone is always shown, and uploaded file chips render *below* it (outside the box). The user wants **one or the other** inside the box — never both, and nothing spilling outside.

### Fix (lines 630–675)
Inside the Attachments column, render conditionally inside the **same** `h-[80px]` bordered container:

- **If `uploadedFiles.length === 0`** → show the dropzone UI (Upload icon + "Click or drag to upload"), wired with `getRootProps()` / `getInputProps()` exactly as today.
- **If `uploadedFiles.length > 0`** → replace the dropzone contents with the file-icon chips (colored `getFileIcon` + small red `×` remove button, `title={getCleanFileName(file.name)}`). Use `flex flex-wrap items-center gap-2 p-2 overflow-auto` inside the same `h-[80px]` border so chips stay contained. No `getRootProps` on this state — the box is purely a chip tray; users remove all chips to get the dropzone back.

### Result
- Attachments box is always exactly 80px tall, aligned with Custom Message and Sending To.
- Either the upload prompt shows, or the chips show — never both, and nothing renders outside the bordered box.

### Files touched
- `src/components/CreatePurchaseOrderDialog.tsx` only.

### Not changing
- Custom Message textarea, Sending To column, line items, buttons, mutation logic — all untouched.