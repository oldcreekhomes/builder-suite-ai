
Goal
- Stop fighting the green match and make the Auto-renew ON toggle a solid black switch.

What I found
- In `src/components/settings/ManageSubscriptionDialog.tsx`, the toggle is already a custom `<button>`, not the shared `Switch`.
- The ON-state rail color is currently set inline as `bg-[#dcfce7] dark:bg-green-900/30`.
- That means this is now a very small, localized fix.

Implementation
1. Update only `src/components/settings/ManageSubscriptionDialog.tsx`.
2. Change the Auto-renew ON-state rail from the current green classes to a literal `bg-black`.
3. Leave the OFF state as `bg-input`.
4. Keep the white thumb so the black rail has strong contrast and stays easy to read/click.
5. Do not change the Paid badge, any shared UI component, or any other settings styling.

Verification
- Open Settings → Subscription.
- Confirm the Paid badge stays green.
- Confirm the Auto-renew toggle shows a solid black background when ON.
- Confirm the toggle still works normally for cancel/reactivate behavior.

Technical details
- Replace:
  - `isOn ? "bg-[#dcfce7] dark:bg-green-900/30" : "bg-input"`
- With:
  - `isOn ? "bg-black" : "bg-input"`
- No global switch changes.
- No opacity utilities on the active black rail.
- Single-file change only.
