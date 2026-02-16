

## Compact Create/Edit Purchase Order Dialog

### Changes to `src/components/CreatePurchaseOrderDialog.tsx`

1. **Notes field**: Change from `rows={2}` Textarea to a single-line `Input` field
2. **Custom Message + Attachments on one row**: Place them side-by-side in a `grid grid-cols-2` layout
   - Left: Custom Message as a compact Textarea (`rows={2}`)
   - Right: Attachments dropzone (smaller padding, compact text)

This removes significant vertical space from the form while keeping all functionality intact.

