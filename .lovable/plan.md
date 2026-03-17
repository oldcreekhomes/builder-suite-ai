

## Fix: Reduce Header Height to Match Approved Bills Style

**Problem**: The dialog header with date pickers and search is taller than the reference (Approved bills header). The `DateInputPicker` defaults to `h-10` internally, and the CSS override `[&_input]:h-9` doesn't properly target the shadcn Input/Button components.

### Changes

**File: `src/components/ui/date-input-picker.tsx`**
- Change the default Input and Button heights from `h-10` to `h-9` (lines 92, 99) to make the component compact by default.

**File: `src/components/accounting/AccountDetailDialog.tsx`**
- Remove the unnecessary `[&_input]:h-9 [&_button]:h-9` className overrides on DateInputPicker (lines 1069, 1075) since the component will now default to h-9.
- Tighten the DialogHeader padding: add `className="py-3"` or similar compact spacing to reduce vertical space.
- Remove `mt-2` from the content div below the header (line 1110).

