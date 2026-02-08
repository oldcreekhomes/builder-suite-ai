

## Update Marketplace Message Dialog Buttons

A simple UI refinement to improve the action button layout in the Send Message modal.

### Current State
- "No thanks" button on the left side (ghost variant)
- "Send" button on the right side
- Buttons are spread apart using `justify-between`

### Changes
**File: `src/components/marketplace/SendMarketplaceMessageModal.tsx`**

Update the footer actions section (lines 228-242):
- Remove "No thanks" text, replace with "Cancel"
- Change layout from `justify-between` to `justify-end` with `gap-2`
- Use `outline` variant for Cancel button to complement the primary Send button
- Keep both buttons together on the right side

### Result
The dialog footer will have:
- **Cancel** button (outline style) - positioned next to Send
- **Send** button (primary style) - on the far right

Both buttons will be grouped together on the right, providing a cleaner, more standard dialog button pattern.

