

## Fix: Calendar Should Open to the Selected Date's Month

**Problem**: When a date like 11/01/2025 is selected, reopening the calendar popover shows today's month (March 2026) instead of November 2025. The `Calendar` component doesn't receive a `defaultMonth` prop, so it always defaults to the current date.

**Fix**: In `src/components/ui/date-input-picker.tsx`, add `defaultMonth={date}` to the `Calendar` component (line 108). Since the popover remounts the Calendar each time it opens, `defaultMonth` will correctly navigate to the selected date's month on each open. If no date is selected, it naturally falls back to today.

### Change

**File: `src/components/ui/date-input-picker.tsx`** — line 106-111, add `defaultMonth={date}`:

```tsx
<Calendar
  mode="single"
  selected={date}
  defaultMonth={date}
  onSelect={handleCalendarSelect}
  initialFocus
/>
```

One line added, no other changes needed.

