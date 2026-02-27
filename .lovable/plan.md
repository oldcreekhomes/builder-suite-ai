
Goal: Make validation failure unmistakable in the Edit Representative flow by showing a red toast even when the user is on the Notifications tab.

What I found:
1. The Settings screen (/settings) uses `src/components/representatives/EditRepresentativeDialog.tsx` (via `RepresentativesTable.tsx`).
2. The recent toast-error logic was added to a different component: `src/components/companies/EditRepresentativeDialog.tsx`.
3. Because the active dialog on Settings never got the new invalid-submit handler, users only see inline validation text (for example, “At least one service area is required”) and no destructive toast.

Implementation plan:
1. Update the correct dialog component used on Settings
   - File: `src/components/representatives/EditRepresentativeDialog.tsx`
   - Add a `handleFormError(errors)` callback for `react-hook-form` invalid submissions.
   - Build a clear error summary message list from key required fields (especially `service_areas`).
   - Trigger a destructive toast:
     - Title: “Missing Required Fields”
     - Description: actionable text that tells them to go to the General tab and add at least one service area.
     - Variant: `destructive` (red).

2. Wire the invalid callback into submit handling
   - Replace current submit call (`form.handleSubmit(onSubmit)(e)`) with `form.handleSubmit(onSubmit, handleFormError)(e)` (or equivalent stable handler).
   - Ensure toast always fires on invalid submit regardless of active tab.

3. Improve cross-tab clarity for this specific case
   - Include explicit tab context in the toast message, for example:
     - “At least one Service Area is required (General tab).”
   - Add a generic fallback message if errors exist but don’t map to a known field:
     - “Please review required fields on the General tab.”

4. Keep behavior consistent across both representative edit dialogs
   - Optionally mirror the same invalid-toast behavior in `src/components/companies/EditRepresentativeDialog.tsx` so both edit experiences behave the same way (prevents future confusion).

Validation checklist after implementation:
1. Open Settings → Representatives → Edit a rep.
2. Remove all service areas, switch to Notifications tab, click Update.
3. Confirm:
   - A red destructive toast appears immediately.
   - Toast clearly states what is missing and where to fix it (General tab).
4. Switch back to General, fix service areas, resubmit, verify successful save toast still works.

Technical notes:
- No backend/database logic changes.
- This is purely client-side validation UX and form submit wiring.
- Existing inline field errors remain; toast is additive for visibility when users are on another tab.
