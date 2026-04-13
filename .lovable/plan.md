

## Hide Subscription Tab for Non-Owners + Green Toggle Switch

### Changes

**1. Hide the "Subscription" sidebar item for non-owners** (`src/pages/Settings.tsx`)
- Import `useUserRole` and conditionally exclude the `{ value: "subscription", label: "Subscription" }` item from the sidebar list when `isOwner` is false
- This completely removes the menu entry so employees never see it

**2. Make the auto-renew toggle switch green when active** (`src/components/settings/ManageSubscriptionDialog.tsx`)
- Add a className to the `<Switch>` component that uses the same green as the "Paid" badge background: `data-[state=checked]:bg-green-100` with a green thumb or the filled green style
- Specifically: use `data-[state=checked]:bg-green-500` to match the green tone from the Paid badge's lighter green background

### Files to modify
1. `src/pages/Settings.tsx` -- filter out subscription sidebar item for non-owners
2. `src/components/settings/ManageSubscriptionDialog.tsx` -- add green color class to Switch

