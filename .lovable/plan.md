

## Compact Folder Access Modal

Simplify the `FolderAccessModal` to show only checkboxes and names (no emails), with tighter spacing.

### Changes: `src/components/files/FolderAccessModal.tsx`

- Remove the email `<p>` element from each employee row
- Remove the nested `<div>` wrapper — just render checkbox + name inline
- Reduce padding from `p-2` to `p-1.5` and gap from `gap-3` to `gap-2`
- Keep the name as a single `<span className="text-sm">` instead of the current two-line layout

Result: each row becomes a single compact line with checkbox and name only.

