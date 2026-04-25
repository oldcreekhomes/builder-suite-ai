## Simplify "Sending To" Display in Confirm PO Dialog

The "Sending To" section currently sits beside the Custom Message field (correct), but is wrapped in a bordered, gray-background box and lays the name and email on the same line with an em-dash separator. The user wants a clean, minimal presentation.

### Changes — `src/components/bidding/ConfirmPODialog.tsx` (lines 441–464)

**Remove all chrome around the recipient:**
- Drop `border rounded-md px-3 py-2 bg-muted/30` and the `min-h-[60px]` from the wrapper.
- Keep the `Label` ("Sending To") with the same styling as "Custom Message (Optional)" so the two headings align.

**Stack name above email:**
- Render the representative's first + last name on the first line (`font-medium text-sm`).
- Render the email directly beneath it on a second line (`text-xs text-muted-foreground`).
- Remove the em-dash and the `<ul>`/`<li>` structure — use simple stacked `<div>`s.

**Empty state:**
- Keep a small italic muted message ("No representatives with PO notifications enabled") with no box.

**Layout preserved:**
- Custom Message remains `w-1/2`, Sending To remains `flex-1`, Add Line button stays on the right.
- Both columns stay aligned at the top via `items-start` (switch from `items-end` so the stacked recipient doesn't bottom-align awkwardly with the textarea).

### Result
Clean, label-only "Sending To" heading with the recipient's name on one line and email on the next — no border, no background, matching the visual weight of the Custom Message label.