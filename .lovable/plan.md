

## Make Both Edit Dialogs Use Native shadcn Patterns

### What Changes

Both `EditDepositDialog` and `EditBillDialog` currently use custom overrides instead of shadcn's built-in primitives. Here's what we'll fix in both:

### 1. Footer: Use `<DialogFooter>` (native shadcn)

**Before** (custom, non-shadcn -- the stretched buttons you dislike):
```text
<div className="flex gap-2 pt-4">
  <Button variant="outline" className="flex-1">Cancel</Button>
  <Button className="flex-1">Save Changes</Button>
</div>
```

**After** (native shadcn -- right-aligned, normal-sized buttons):
```text
<DialogFooter>
  <Button variant="outline" ...>Cancel</Button>
  <Button ...>Save Changes</Button>
</DialogFooter>
```

shadcn's `DialogFooter` renders `sm:flex-row sm:justify-end sm:space-x-2` -- clean, right-aligned, standard spacing. No custom classes needed.

### 2. Container: Shrink from `max-w-6xl` to `max-w-4xl`

`max-w-6xl` (1152px) is way too wide for these forms. `max-w-4xl` (896px) is closer to what shadcn demos use for complex dialogs. Both dialogs get this change.

### 3. Remove the custom "Line Items" heading

The `<h3 className="text-lg font-medium">Line Items</h3>` is redundant -- the Tabs already make it obvious. Removing it tightens the layout.

### 4. Keep what already works

The line items table structure (`border rounded-lg overflow-hidden`, `bg-muted` header, `border-t` separators) is fine and not part of shadcn's scope -- it's application-specific data display. No changes there.

### Files Changed

| File | Changes |
|------|---------|
| `src/components/deposits/EditDepositDialog.tsx` | Use `DialogFooter` for buttons, change `max-w-6xl` to `max-w-4xl`, remove "Line Items" heading, import `DialogFooter` |
| `src/components/bills/EditBillDialog.tsx` | Use `DialogFooter` for buttons, change `max-w-6xl` to `max-w-4xl` (both loading and main content), remove "Line Items" heading |

### Technical Details

**EditDepositDialog changes:**
- Add `DialogFooter` to the import from `@/components/ui/dialog`
- Replace lines 528-547 (the `div.flex.gap-2.pt-4` footer) with `<DialogFooter>` containing normal Cancel + Save buttons
- Change line 449 and 432: `max-w-6xl` to `max-w-4xl`
- Remove line 502: the `<h3>Line Items</h3>` heading

**EditBillDialog changes:**
- Lines 1097-1115: Replace the `div.flex.gap-2.pt-4` footer with `<DialogFooter>` containing normal Cancel + Save buttons
- Lines 604 and 587: `max-w-6xl` to `max-w-4xl`
- Remove line 809: the `<h3>Line Items</h3>` heading

