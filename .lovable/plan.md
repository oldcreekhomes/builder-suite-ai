

## Make Inputs Page Styling Identical to Dashboard

### Problems Identified
1. **No commas in numbers** — Dashboard shows `$2,400,000` via `fmt()`, Inputs shows raw `2400000`
2. **`$` and `%` symbols separated from values** — Dashboard has them as part of one string, Inputs renders them as separate spans with visible gap
3. **Input focus rings/outlines** — The shadcn Input component adds `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` which creates visible ring decorations not present on Dashboard
4. **Browser input spinners/icons** — Number inputs may show browser-default increment arrows on the right side
5. **Font weight inconsistency** — Dashboard values have no explicit font-medium on non-bold rows; Inputs applies `font-medium` to prefix/suffix/input
6. **Total Taxes row** — label says "Total Taxes ($)" but Dashboard equivalent just says "Taxes"

### Approach
Rework `EditableRow` to visually match the Dashboard `Row` component exactly:

1. **Format displayed values with commas** — When not focused, show the value through a formatting function (with commas). When focused, show the raw number for editing. This makes the unfocused state look identical to Dashboard.
2. **Eliminate separate prefix/suffix spans** — Instead, when unfocused, display the formatted string (e.g., `$2,400,000` or `5.0%`) as a single clickable span that looks exactly like Dashboard text. When clicked/focused, swap to a plain input for editing.
3. **Remove input visual artifacts** — Strip all focus rings, ring offsets, and ensure `type="text"` to prevent browser number spinners/arrows.
4. **Match font styling** — Non-bold values on Dashboard have no special font weight. Match that exactly.
5. **Clean up labels** — Remove redundant `($)` and `(%)` from labels to match Dashboard's cleaner labels (e.g., "Insurance" not "Insurance ($)").

### Implementation Detail
The `EditableRow` component will render in two modes:
- **Display mode** (not focused): Renders a `<span>` styled identically to Dashboard's `Row` value — right-aligned, same font, formatted with commas/`$`/`%` built in. Clicking it switches to edit mode.
- **Edit mode** (focused): Renders a minimal `<input>` with no borders, rings, or decorations, showing the raw number for easy editing.

This ensures the Inputs page is visually indistinguishable from the Dashboard when not actively editing a field.

### Files Changed
- `src/pages/apartments/ApartmentInputs.tsx` — Rewrite `EditableRow` with display/edit toggle, remove separate prefix/suffix, add formatting, strip input decorations

