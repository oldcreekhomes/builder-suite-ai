
## Fix: Wrap the Files Table in the Standard Bordered Container

### The Problem
Every table in the application (Manage Bills, Companies, Representatives, etc.) lives inside a `<div className="border rounded-lg overflow-hidden">` wrapper. This gives the table its characteristic bordered, self-contained look with rounded corners — like the invoice table in the screenshot.

The files table is missing this wrapper entirely. The `<Table>` is rendered bare inside a `<div className="flex-1 overflow-auto">` in `SimpleFileManager.tsx`, so it looks like floating horizontal lines with no border box around it.

### The Fix — Two Small Changes

**1. `src/components/files/SimpleFileManager.tsx`**

Wrap the `<SimpleFileList>` call (line 908–918) in the standard container:

```
Before:
  <div className="flex-1 overflow-auto">
    <SimpleFileList ... />
  </div>

After:
  <div className="flex-1 overflow-auto p-4">
    <div className="border rounded-lg overflow-hidden">
      <SimpleFileList ... />
    </div>
  </div>
```

**2. `src/components/files/SimpleFileList.tsx`**

The `<Table>` component internally wraps itself in `<div className="relative w-full overflow-auto">`. Since the outer container now provides the border and clip, pass `containerClassName="relative w-full"` to the `<Table>` to disable its own internal overflow scroll — preventing a double-scrollbar situation (same pattern used in dialogs per the standardization memory).

### Result

The files table will look exactly like the invoice/bills table in the screenshot: a clean, bordered, rounded rectangle that is independent and self-contained on the page, with all folder rows, file rows, headers, and checkboxes sitting inside it.

### What Is Not Changed
- All columns, row actions, folder navigation, bulk selection, upload logic, breadcrumbs — untouched
- No logic changes whatsoever — purely a layout wrapper addition
