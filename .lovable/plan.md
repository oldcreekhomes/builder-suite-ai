
## Fix: Show Actual File Names on Attached Proposals in Confirm PO Dialog

### The Problem

In the `ConfirmPODialog`, the attached proposals section shows only file type icons with a hardcoded tooltip that says "Preview PDF file" — regardless of the actual file type or name. This means the user cannot tell which file is which when reviewing before sending the PO.

The root causes:
1. `getCleanFileName` is **not imported** in `ConfirmPODialog.tsx` — only `getFileIcon` and `getFileIconColor` are imported.
2. The tooltip text is hardcoded as `"Preview {fileName.split('.').pop()?.toUpperCase()} file"` — which is generic (just says "Preview PDF file").
3. There is no visible label beneath the icon showing the human-readable file name.

### The Fix

**File: `src/components/bidding/ConfirmPODialog.tsx`**

**Change 1 — Import `getCleanFileName`:**
```ts
import { getFileIcon, getFileIconColor, getCleanFileName } from '../bidding/utils/fileIconUtils';
```

**Change 2 — Restructure each file item** to show:
- The icon (clickable to preview)
- The cleaned file name as a visible label beneath the icon
- The tooltip showing the full clean name on hover

Replace the current icon-only button with a stacked layout:

```tsx
<Tooltip key={index}>
  <TooltipTrigger asChild>
    <button
      onClick={() => handleFilePreview(fileName)}
      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer max-w-[80px]"
    >
      <IconComponent className={`h-6 w-6 ${iconColor}`} />
      <span className="text-xs text-gray-600 truncate w-full text-center">
        {getCleanFileName(fileName)}
      </span>
    </button>
  </TooltipTrigger>
  <TooltipContent>
    <p>{getCleanFileName(fileName)}</p>
  </TooltipContent>
</Tooltip>
```

This gives each file:
- A recognizable icon (red for PDF, green for Excel, blue for Word)
- A truncated visible name label beneath it (e.g., "Roofing Quote.pdf")
- A full name on hover via tooltip

### What `getCleanFileName` Does

The function strips the UUID/timestamp storage prefixes added during upload, e.g.:
- `4430_abc123_1738123456789_random.Roofing Quote.pdf` → `Roofing Quote.pdf`
- `proposal_550e8400-e29b-41d4-a716-446655440000_1738000000000_Invoice.pdf` → `Invoice.pdf`

### Files to Change

Only **1 file**: `src/components/bidding/ConfirmPODialog.tsx`
- Add `getCleanFileName` to the import on line 5
- Update the file button/tooltip rendering block (lines 162–180)

This is a minimal, targeted change with no side effects.
