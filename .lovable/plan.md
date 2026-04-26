# Hide Vendor-Email UI on Locked PO Edits

When `isLocked` is true (PO has `sent_at`), the dialog already suppresses the vendor email entirely on save. The "Custom Message" and "Sending To" fields are therefore meaningless and misleading in that state. Hide them — keep one dialog, just conditional rendering.

## Change (single file)

**`src/components/CreatePurchaseOrderDialog.tsx`** — around lines 782–862:

- When `isLocked`:
  - Hide the **Custom Message (Optional)** column.
  - Hide the **Sending To** column.
  - Keep the **Attachments** column visible (attachments are still editable internally).
  - Collapse the wrapper from `grid-cols-3` to a single-column layout so Attachments doesn't stretch awkwardly — use `grid-cols-1` (or just render the Attachments block without the grid) constrained to a reasonable max width (e.g. `max-w-sm`) to match the existing column width.
- When unlocked (creating a new PO or editing an unsent one): render all three columns exactly as today.

### Sketch
```tsx
{isLocked ? (
  <div className="max-w-sm space-y-1.5">
    <Label>Attachments</Label>
    {/* existing attachments block unchanged */}
  </div>
) : (
  <div className="grid grid-cols-3 gap-4">
    {/* existing Custom Message + Attachments + Sending To unchanged */}
  </div>
)}
```

## Out of Scope
- No changes to save logic, email suppression, or lock detection (already correct).
- No second dialog, no new components.
- No styling changes to the line-items table.
