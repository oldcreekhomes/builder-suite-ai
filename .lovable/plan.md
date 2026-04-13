
Goal
- Make the Auto-renew ON track use the exact same muted green as the Paid badge background, with no washed-out border/ring.

What I found
- In `src/components/settings/ManageSubscriptionDialog.tsx`, the Paid badge uses `bg-green-100 dark:bg-green-900/30`.
- The Auto-renew control still uses the shared `Switch` from `src/components/ui/switch.tsx`.
- That shared switch hardcodes a bordered track (`border-2`) plus its own checked/unchecked background classes.
- That shared track styling is the real reason the toggle keeps looking dulled even after local class overrides.

Implementation
1. Update only `src/components/settings/ManageSubscriptionDialog.tsx`.
2. Extract the Paid badge’s green surface into one local constant so the Paid badge and Auto-renew ON state literally use the same color source.
3. Replace this one Auto-renew `Switch` instance with a small local accessible switch button inside the dialog, instead of continuing to fight the shared `Switch` styling.
4. Render the local track borderless; when ON it uses the exact Paid-badge green surface, when OFF it stays neutral.
5. Keep the white thumb, current toggle behavior, disabled state, and slide animation.
6. Wire the label accessibly with `aria-label`/`aria-labelledby` since this control will no longer be the shared Radix switch component.
7. Verify in the Manage Subscription dialog that the Paid badge background and the ON toggle track match side by side in light mode.

Technical details
- Paid badge source to reuse: `bg-green-100 dark:bg-green-900/30`.
- No global changes to `src/components/ui/switch.tsx`.
- This is the safest fix because it removes the shared switch’s built-in border/background styling from the one place where an exact visual match is required.
