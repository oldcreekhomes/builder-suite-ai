

## Fix: Move Date/Search Filters Inline with Title Row

**Problem**: The date pickers and search input are rendered as a separate row below the dialog header, adding unnecessary vertical height. They should be in the same row as the title, pushed to the right — matching the Approved bills header pattern.

### Changes

**File: `src/components/accounting/AccountDetailDialog.tsx`**

1. **Merge the filter controls into the header row** (lines 1058-1113): Remove the separate `<div className="flex items-center gap-2 flex-wrap">` block (lines 1079-1113) and move its contents into the existing header `<div className="flex items-center justify-between">` row, to the right of the title.

2. **Use compact h-9 sizing** on the DateInputPicker inputs and search Input to match the standardized header action height.

3. **Restructured layout**:
```text
┌──────────────────────────────────────────────────────────────────────────┐
│ 1010 - Atlantic Union Bank    From [__] 📅 To [__] 📅 Clear  🔍Search  │
└──────────────────────────────────────────────────────────────────────────┘
```

The title stays on the left. The Hide Paid toggle (when visible), date pickers, Clear dates link, and search input all sit on the right side in a single compact row. The DateInputPicker input width stays at `w-32` and uses `h-9` to match the header standard. The search Input uses `h-9 w-52`.

