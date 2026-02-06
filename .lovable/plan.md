
Goal: make the “Select Project Files” modal scroll reliably through long folder lists (mouse wheel / trackpad), without requiring a visible scrollbar.

What’s happening (why it won’t scroll right now)
- The modal body uses a flex column layout with an inner wrapper that has `overflow-hidden`.
- In CSS flex layouts, children default to `min-height: auto`, which often prevents a “scroll child” from shrinking to create overflow. The result is: the list gets clipped, but never becomes a true scroll container.
- Radix `ScrollArea` also relies on the container having a real computed height; in this current layout, it’s not getting a height constraint in a way that allows overflow scrolling to activate.

Proposed fix (robust, minimal UI change)
We’ll make the list area a native scroll container and ensure the flex wrappers allow shrinking:
1) Constrain the modal to a fixed viewport-relative height
   - Update `DialogContent` in `src/components/bidding/SelectProjectFilesModal.tsx` from:
     - `max-h-[80vh] flex flex-col`
   - To:
     - `h-[80vh] max-h-[80vh] flex flex-col overflow-hidden`
   Why: giving the dialog an actual height (not just max-height) and hiding overflow at the dialog boundary creates a stable box for the scroll region to live inside.

2) Allow flex children to shrink (the critical `min-h-0` change)
   - Update the modal’s main content wrapper (currently):
     - `className="space-y-4 flex-1 overflow-hidden flex flex-col"`
   - To:
     - `className="min-h-0 space-y-4 flex-1 overflow-hidden flex flex-col"`
   Why: `min-h-0` is the common fix that allows the scrolling child to actually become smaller than its content.

3) Replace Radix ScrollArea with a simple scrollable div for this modal (most reliable)
   - In `SelectProjectFilesModal.tsx`, replace:
     - `<ScrollArea className="flex-1 border rounded-md max-h-[400px]"> ... </ScrollArea>`
   - With:
     - `<div className="min-h-0 flex-1 overflow-y-auto border rounded-md ..."> ... </div>`
   Why: native overflow scrolling is the most dependable option in constrained flex layouts; it also makes “scroll without a visible bar” easier and avoids any Radix sizing quirks.

4) Hide the scrollbar (optional but matches your “ideally no bar” request)
   - Add scrollbar-hiding styles directly as Tailwind arbitrary properties on that scroll div (scoped only to this modal), for example:
     - `[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`
   Result: users can still scroll with wheel/trackpad/touch, but the scrollbar doesn’t show.

5) Remove the now-unused import
   - Remove `ScrollArea` import from `src/components/bidding/SelectProjectFilesModal.tsx` once we switch to a plain div.

Files involved
- `src/components/bidding/SelectProjectFilesModal.tsx`
  - Add `h-[80vh]` + `overflow-hidden` on `DialogContent`
  - Add `min-h-0` to the flex wrapper above the list
  - Replace `ScrollArea` with a `div` scroll container (and optionally hide scrollbar via scoped CSS classes)
  - Remove `ScrollArea` import

Acceptance criteria (how we’ll verify)
- In /project/:id/bidding → Add Files → Project Files modal:
  - You can scroll past “Closing Reports” and reach all remaining folders.
  - Trackpad/mouse wheel scrolling works when the cursor is over the list.
  - Header (title + breadcrumb) stays visible while only the list scrolls.
  - (If scrollbar hiding is applied) no visible scrollbar appears, but scrolling still works.

Edge cases to check
- Root folder view with many folders
- Deep subfolder navigation (scroll works there too)
- Empty folder state still renders centered and does not create weird spacing
