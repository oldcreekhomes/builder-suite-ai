
## The Problem: What's Actually Happening

After reading the complete `BillsApprovalTable.tsx` file carefully, the issue is now completely understood.

### Column Width Math

The Paid tab has these columns (no project column since `showProjectColumn={false}`):

| Column | Width |
|---|---|
| Vendor | 144px (w-36) |
| Cost Code | 176px (w-44) |
| Bill Date | 96px (w-24) |
| Due Date | 96px (w-24) |
| Amount | 96px (w-24) |
| Reference | 128px (w-32) |
| Memo | 48px (w-12) |
| Address | 96px (w-24) |
| Files | 56px (w-14) |
| Notes | 56px (w-14) |
| **PO Status** | **80px (w-20)** |
| **Cleared** | **96px (w-24)** |
| **Actions** | **64px (w-16)** (if user can delete) |

**Total: ~1232px minimum.** The table genuinely needs over 1200px.

### Why It's Still Broken After All Attempts

The current code (after all previous fixes) is:

```tsx
<div className="flex flex-col h-full min-w-0">
  <div className="border rounded-lg overflow-hidden min-w-0">
    <Table className="min-w-[1200px]">
```

Two problems co-exist:

1. `overflow-hidden` on the border wrapper is clipping the scroll container. The `<Table>` component internally renders `<div class="relative w-full overflow-auto">` wrapping the `<table>`. When the outer div has `overflow-hidden`, the browser clips that entire scroll container at the parent's boundary — making the scrollbar either invisible or non-functional in WebKit/Safari-based rendering environments.

2. `min-w-[1200px]` on `<Table>` applies to the `<table>` HTML element — but the Tailwind class `w-full` (also on `<table>`) and `min-w-[1200px]` both apply. In the absence of a working scroll container (due to problem #1), the table just gets squeezed.

### The Definitive Fix

Two targeted changes to `BillsApprovalTable.tsx`:

**Change 1 (line 598):** Remove `overflow-hidden` from the border wrapper. The border and rounded corners work fine without it — modern browsers clip `border-radius` correctly on block elements without needing `overflow-hidden` as long as the inner scroll container handles its own overflow.

```tsx
// BEFORE (broken):
<div className="border rounded-lg overflow-hidden min-w-0">

// AFTER (fixed):
<div className="border rounded-lg min-w-0">
```

**Change 2 (line 599):** Keep `min-w-[1200px]` on the Table so the table is wide enough to require horizontal scroll, but also remove `h-full` from the outer flex wrapper since it's not needed and can cause collapsed containers in certain layout contexts.

```tsx
// Line 596 — also simplify outer wrapper:
// BEFORE:
<div className="flex flex-col h-full min-w-0">

// AFTER:
<div className="flex flex-col min-w-0">
```

The full corrected structure becomes:

```tsx
<div className="flex flex-col min-w-0">
  <div className="border rounded-lg min-w-0">
    <Table className="min-w-[1200px]">
      ...all columns including PO Status, Cleared, Actions...
    </Table>
  </div>
  {/* Footer */}
</div>
```

### Why This Works

- `border rounded-lg` on the wrapper provides the visual border and rounded corners without clipping children
- The `<Table>` component's own internal `<div class="relative w-full overflow-auto">` handles horizontal scrolling freely (not clipped by `overflow-hidden` on the parent)
- `min-w-[1200px]` on the `<table>` element ensures the table is wider than its container, triggering the `overflow-auto` scrollbar
- `min-w-0` on both flex containers prevents flex children from overflowing their parent in the opposite direction

### Files Changed

- `src/components/bills/BillsApprovalTable.tsx` — lines 596 and 598 only:
  - Line 596: Remove `h-full` from flex wrapper
  - Line 598: Remove `overflow-hidden` from border wrapper
