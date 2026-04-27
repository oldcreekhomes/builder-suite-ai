## Goal

Make the "Enter with ML" extraction loader on the Manage Bills page **pixel-identical** to the loader shown when converting a bid into a Purchase Order ("Creating PO from machine learning"). Same logo, font, color, sizing, padding, and animation — just different wording for the bill context.

## What's different today

The two loaders already share the same Sparkles icon and animation keyframes, but they render in different containers, which makes them look "off":

| | PO loader (reference) | Bills loader (current) |
|---|---|---|
| Container | Centered modal, no border, plain background | Bordered box (`border bg-muted/30`), fixed `h-64` |
| Vertical padding | `py-16` | `py-8` |
| Text | "Creating PO from machine learning" | "Extracting N bill(s) with machine learning" |

Same icon size (`h-12 w-12 text-primary`), same text class (`text-sm font-medium text-muted-foreground`), same float + dots animations.

## Changes

**File: `src/components/bills/BillsApprovalTabs.tsx`** (the `isExtracting` block around lines 910–938)

1. Remove the bordered/muted wrapper (`h-64 ... rounded-md border bg-muted/30`). Render the loader inline on the plain page background, exactly like the PO dialog's body.
2. Change the inner padding from `py-8` to `py-16` to match the PO loader's vertical breathing room.
3. Keep the Sparkles icon, animations, font, color, and dot-cycling exactly as they are (they already match the PO version).
4. Update the wording to mirror the PO phrasing style: **"Extracting bill from machine learning"** (singular) or **"Extracting N bills from machine learning"** (plural) — using "from" to match "Creating PO from machine learning".

### Resulting markup (conceptual)

```text
<div className="flex flex-col items-center justify-center py-16 gap-4">
  <Sparkles className="bill-ai-icon h-12 w-12 text-primary" />
  <p className="bill-ai-text text-sm font-medium text-muted-foreground">
    Extracting {n} bill{s} from machine learning
  </p>
</div>
```

Identical font weight, size, color, icon, and animation as the PO loader — only the verb/object differ.

## Out of scope

- The small "Extracting 1 file…" indicator in the page header (top-right). That's a separate upload-progress chip, not the ML loader, and the user's screenshot shows it is fine.
- No changes to the PO loader.
- No logic changes — purely visual alignment.
