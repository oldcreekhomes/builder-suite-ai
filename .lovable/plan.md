
Goal
- Make the Auto-renew ON switch rail look exactly like the green Paid badge background.

What I found
- I dug into `src/components/settings/ManageSubscriptionDialog.tsx`.
- The Paid badge and the ON toggle already use the same Tailwind color token: `bg-green-100 dark:bg-green-900/30`.
- So this is not actually a wrong-color-class problem.
- The mismatch is visual: the current custom toggle has a large white thumb plus `shadow-lg` and no clipped/inset rail, which makes the green read washed out even though the class name matches.

Implementation
1. Update only `src/components/settings/ManageSubscriptionDialog.tsx`.
2. Extract one shared paid-surface source and use it for both:
   - the Paid badge background
   - the toggle ON rail
3. Rebuild the Auto-renew control as a true 2-layer switch:
   - rail layer = exact Paid badge surface
   - thumb layer = separate white circle on top
4. Add `overflow-hidden` and a small inset/padding to the rail so the green stays clearly visible around the thumb.
5. Remove or reduce the thumb shadow and tune the thumb size/translate so the rail no longer looks faded.
6. If there is still any doubt from utility-class merging, switch both the badge and the ON rail to the exact literal light-mode color (`#dcfce7`) from Tailwind green-100, while preserving the current dark-mode green surface.
7. Verify the Manage Subscription dialog side-by-side in light mode so the ON rail matches the Paid badge visually, not just “technically” in class names.

Technical details
- This is not an opacity bug in the rail class itself.
- It is a rendering/geometry issue caused by the thumb and shadow overpowering the small track.
- No global `Switch` changes.
- No extra panel/background around the toggle.
