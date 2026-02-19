
## Fix: Move the X Delete Button to Sit Directly on the File Icon

### The Problem

In `ConfirmPODialog.tsx`, the `relative` wrapper `<div>` wraps the entire file card — both the icon and the filename label below it. Because `absolute -top-1 -right-1` is relative to this full container, the X ends up at the top-right corner of the whole card (icon + text), which pushes it far away from the icon.

In the reference standard (the `ProposalCell` in the Bid Package modal), the `relative` container only wraps the icon button itself — so `-top-1 -right-1` places the X right next to the corner of the icon.

### The Fix

**File: `src/components/bidding/ConfirmPODialog.tsx`** — restructure the file item layout so:

1. The outer `<div>` is no longer `relative` — it just stacks children vertically (`flex flex-col items-center`)
2. A new inner `<div className="relative">` wraps **only the icon button** (not the filename label)
3. The X button's `absolute -top-1 -right-1` now positions it at the corner of just the icon, matching the reference standard

**Before (simplified):**
```tsx
<div className="relative">           {/* wraps icon + label — X ends up far right */}
  <Tooltip>
    <button>
      <IconComponent />              {/* icon */}
      <span>{cleanName}</span>       {/* label */}
    </button>
  </Tooltip>
  <button className="absolute -top-1 -right-1 ...">×</button>   {/* X is at card edge */}
</div>
```

**After (simplified):**
```tsx
<div className="flex flex-col items-center">    {/* outer: stacks icon+label vertically */}
  <div className="relative">                    {/* inner: wraps icon only */}
    <Tooltip>
      <TooltipTrigger asChild>
        <button onClick={() => handleFilePreview(fileName)}
          className="flex items-center justify-center p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer">
          <IconComponent className={`h-6 w-6 ${iconColor}`} />
        </button>
      </TooltipTrigger>
      <TooltipContent><p>{cleanName}</p></TooltipContent>
    </Tooltip>
    <button className="absolute -top-1 -right-1 bg-destructive ...">×</button>  {/* X sits on icon */}
  </div>
  <span className="text-xs text-muted-foreground truncate max-w-[60px] text-center mt-1">
    {cleanName}
  </span>
</div>
```

This exactly mirrors the `ProposalCell` pattern where the X overlaps the top-right corner of the file icon only.

### Files to Change

Only **1 file**: `src/components/bidding/ConfirmPODialog.tsx`

- Restructure lines 172–200: separate the `relative` wrapper from the label so the X button positions relative to the icon only
- No logic changes — same `setFileToDelete`, same `handleFilePreview`, same `DeleteConfirmationDialog`
