
## Root Cause — Finally Confirmed

After reading every line of the relevant files, the definitive cause is now understood.

The current rendered HTML structure for the Paid tab is:

```
<div class="flex flex-col min-w-0">
  <div class="border rounded-lg overflow-hidden">       ← CLIPPING THE SCROLLBAR
    <div class="relative w-full overflow-x-auto">       ← Table's containerClassName
      <table class="w-full min-w-[1200px]">             ← Table's className
        ... all columns including PO Status, Cleared, Actions ...
      </table>
    </div>
  </div>
</div>
```

The `overflow-hidden` on the border wrapper (line 598) **clips the horizontal scrollbar** that `overflow-x-auto` tries to render inside it. This is a fundamental CSS rule: a parent with `overflow: hidden` clips all overflow from its children, including scrollbars. The 3 rightmost columns (PO Status, Cleared, Actions) exist in the DOM but are unreachable because the scrollbar is clipped away.

Every back-and-forth attempt has been toggling `overflow-hidden` on and off — but whenever it was removed, it was later re-added because "rounded corners need it." They do not. Modern browsers correctly apply `border-radius` to block-level elements without requiring `overflow: hidden`.

## The Single Correct Fix

**File: `src/components/bills/BillsApprovalTable.tsx`, line 598**

Remove `overflow-hidden` from the border wrapper div. This is the **only** change needed.

```tsx
// CURRENT (broken — overflow-hidden clips the scrollbar):
<div className="border rounded-lg overflow-hidden">

// FIXED (correct — scrollbar renders freely, border-radius still works):
<div className="border rounded-lg">
```

The complete structure after the fix:

```
<div class="flex flex-col min-w-0">
  <div class="border rounded-lg">                       ← no overflow clipping
    <div class="relative w-full overflow-x-auto">       ← scrollbar renders freely
      <table class="w-full min-w-[1200px]">             ← wider than viewport → scroll activates
        ... Vendor | Cost Code | Bill Date | Due Date | Amount | Reference | Memo | Address | Files | Notes | PO Status | Cleared | Actions ...
      </table>
    </div>
  </div>
</div>
```

### Why This Works Now (and Why Previous Attempts Failed)

| Attempt | What happened |
|---|---|
| Add `min-w-[1200px]` to `<Table>` | Applied to `<table>`, but `overflow-hidden` on wrapper still clipped scrollbar |
| Remove `overflow-hidden` | Scrollbar freed — but this was reversed in the next plan |
| Add `containerClassName="relative w-full overflow-x-auto"` + re-add `overflow-hidden` | `overflow-x-auto` creates scrollbar, but `overflow-hidden` on parent immediately clips it |
| **This fix: remove `overflow-hidden` permanently** | Scrollbar from `overflow-x-auto` renders freely; table at `min-w-[1200px]` is wider than viewport; horizontal scroll activates; all 3 columns visible |

### Why Rounded Corners Still Work Without `overflow-hidden`

`border-radius` on a `<div>` correctly clips the div's own background and border without `overflow: hidden`. The `overflow: hidden` is only needed to clip child content that would visually overflow the rounded corner (e.g., images or backgrounds in child elements). In this case, the only child content is a plain white table — there is nothing to clip. The border and rounded corners display identically with or without `overflow: hidden`.

### Single Change

**`src/components/bills/BillsApprovalTable.tsx`** — line 598 only:
- Remove `overflow-hidden` from `<div className="border rounded-lg overflow-hidden">`
- Result: `<div className="border rounded-lg">`
