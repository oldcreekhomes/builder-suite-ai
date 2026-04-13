
Goal: stop trying to match the green badge and instead make the Auto-renew toggle use the same gray as the Manage Subscription dialog/page background, while keeping the white thumb.

What I found:
- The Paid badge is intentionally green in `src/components/settings/ManageSubscriptionDialog.tsx` via `bg-green-100`.
- The toggle is a shared `Switch` component from `src/components/ui/switch.tsx`.
- That shared switch always applies:
  - `border-2`
  - `data-[state=checked]:bg-primary`
  - `data-[state=unchecked]:bg-input`
- The subscription dialog is currently overriding only the checked background:
  - `className="data-[state=checked]:!bg-green-100 border-transparent"`
- That means the toggle is still fighting the base shared switch styles, and the “off”/border appearance is not being aligned to the dialog’s neutral background.

Implementation plan:
1. Update the Auto-renew switch in `src/components/settings/ManageSubscriptionDialog.tsx` so both states use the same neutral gray track/background instead of green.
2. Force both the checked and unchecked track color to the same gray token that matches the dialog/page surface, and also force the border to that same gray so there is no second tint.
3. Keep the white thumb exactly as-is by leaving the shared thumb styling alone in `src/components/ui/switch.tsx`.
4. Do not change the shared Switch component globally, so other switches in the app keep their current behavior.
5. Verify in the subscription dialog that:
   - the track is the same gray as the surrounding dialog/page surface,
   - the border no longer looks like a different color,
   - the thumb stays white,
   - both on/off states look visually consistent except for thumb position.

Likely implementation detail:
- Replace the current green override on the subscription toggle with state overrides like:
  - `data-[state=checked]:!bg-muted`
  - `data-[state=unchecked]:!bg-muted`
  - `!border-muted`
or, if the dialog background itself is the closer match after preview check:
  - `data-[state=checked]:!bg-background`
  - `data-[state=unchecked]:!bg-background`
  - `!border-background`

Technical note:
- Based on the current code, the issue is not the white circle; that part is already correct.
- The real mismatch is the track plus border color coming from shared switch defaults and partial local overrides.
- The safest fix is a local, explicit override in `ManageSubscriptionDialog.tsx`, not a global refactor of `src/components/ui/switch.tsx`.
