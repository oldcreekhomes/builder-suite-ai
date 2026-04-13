
Goal
- Make the Auto-renew ON track use the exact same muted green as the "Paid" badge background.

What I found
- In `src/components/settings/ManageSubscriptionDialog.tsx`, the Paid badge uses `bg-green-100`.
- The Auto-renew toggle is still rendered through the shared `Switch` component, which brings its own checked/unchecked track styling and a `border-2`.
- So even though the toggle already says `bg-green-100`, the shared switch styling is still what makes it look slightly washed out/different.

Implementation
1. Update only `src/components/settings/ManageSubscriptionDialog.tsx`.
2. Make the Paid badge and the toggle’s checked state use the same green source, instead of treating them as separate styles.
3. Change the toggle’s checked state so both the track fill and the checked border use that exact same green.
4. Keep the white thumb exactly as it is.
5. Leave the unchecked state neutral and do not change the shared `src/components/ui/switch.tsx` globally.
6. Verify in the Manage Subscription dialog that the Paid badge background and the ON toggle track visually match side by side.

Technical details
- The main fix is to stop using a transparent checked border and instead use the same green on both the checked background and checked border, e.g. the checked state should be driven by the same green token as the Paid badge.
- If the shared switch still makes the green look different after that, the fallback is a one-off local override in `ManageSubscriptionDialog.tsx` that forces the exact same color value directly for the checked track, so there is no opacity/inherited-style mismatch.
