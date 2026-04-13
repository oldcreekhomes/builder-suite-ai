

## Fix Auto-Renew Toggle to Match Paid Badge Color

### Problem
The Switch component's base class includes `data-[state=checked]:bg-primary`, which has the same CSS specificity as the override `data-[state=checked]:bg-green-100` passed via className. Tailwind's class merging (via `cn()`) may not reliably resolve the conflict, causing the toggle to show the primary color or a blended result instead of the exact `bg-green-100`.

### Solution
Use the `!important` modifier in Tailwind (`!bg-green-100`) to force the green background to win over the base style.

### File to modify
**`src/components/settings/ManageSubscriptionDialog.tsx`** (line ~552)
- Change `data-[state=checked]:bg-green-100` to `data-[state=checked]:!bg-green-100`

