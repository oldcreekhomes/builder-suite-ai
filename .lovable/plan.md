
<summary>
The behavior you’re calling “going to the Company/Rep page” is almost certainly not a route change at all. What’s happening is: the Edit Company dialog is closing because the Edit Company form is being submitted when you click “Update Representative”, and Edit Company’s success handler explicitly closes itself.

So we don’t need “navigate back to the reps tab.” We need to stop the nested representative form submit event from triggering the parent Edit Company form submit.
</summary>

<what-we-found-in-the-code>
1) Edit Company closes only via explicit code in `EditCompanyDialog.tsx`:
- `updateCompanyMutation.onSuccess` shows toast “Company updated successfully” and calls `onOpenChange(false)` (which clears `editingCompany` in `CompaniesTable` and unmounts the dialog).

2) Users are seeing the “Company updated successfully” toast after updating a representative (from your earlier replay/video descriptions). That means the parent company update mutation is firing at the same time as representative update.

3) Key technical detail (this is the missing puzzle piece):
- React synthetic events bubble through the React component tree even across portals.
- Your Edit Representative dialog is rendered inside `EditCompanyDialog`’s React tree (it’s returned by `RepresentativeContent`, which is inside the Edit Company `<form>`).
- When the representative dialog’s `<form>` submits (Update Representative button is `type="submit"`), that submit event can bubble to the parent company form handler in React — even though the dialog content is portaled in the DOM.

That explains perfectly:
- Rep saves successfully
- Then Company also “saves successfully”
- Then Edit Company closes (because company onSuccess closes it)
- You land back on the underlying Companies/Representatives page
</what-we-found-in-the-code>

<root-cause>
The nested “Edit Representative” form submit event is bubbling up (via React’s event system) and triggering the parent “Edit Company” form submission handler. The parent then runs `updateCompanyMutation`, shows “Company updated successfully”, and closes the dialog.

This is why all the Radix “outside click” protections haven’t solved it: the close is coming from the parent’s own successful submit, not from outside interactions.
</root-cause>

<fix-strategy>
Stop submit propagation from the nested representative form so it cannot trigger the parent company form submission.

We will:
- Intercept the representative form submit event and call `e.preventDefault()` + `e.stopPropagation()`.
- Then run the representative `react-hook-form` submit programmatically.
- (Optional hardening) Also stop propagation on the Update Representative button click in capture phase to eliminate edge cases.
</fix-strategy>

<implementation-steps>
Step 1 — Patch nested representative form submit to not bubble
File: `src/components/companies/EditRepresentativeDialog.tsx`

Change:
- Current:
  - `<form onSubmit={form.handleSubmit(onSubmit)} ...>`
- New:
  - `<form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); void form.handleSubmit(onSubmit)(); }} ...>`

Notes:
- We’ll call `form.handleSubmit(onSubmit)()` directly so the representative save still runs, but no submit event reaches the parent.
- Keep the Update button as `type="submit"` (or optionally convert it to `type="button"` and call submit manually).

Step 2 — Add “belt and suspenders” event blocking on the Update button
File: `src/components/companies/EditRepresentativeDialog.tsx`

Add to the Update Representative button:
- `onPointerDownCapture={(e) => e.stopPropagation()}`
- `onClickCapture={(e) => e.stopPropagation()}`

This prevents any click/submit related events from bubbling into the Edit Company dialog tree.

Step 3 — Verify we no longer see “Company updated successfully” toast when updating a rep
Because that toast only exists in `EditCompanyDialog.tsx`, it’s a perfect indicator:
- After this fix, updating a representative should show only:
  - “Representative updated successfully”
- The Edit Company dialog should remain open, on the Representatives tab.

Step 4 (optional) — Apply the same pattern to any other nested dialogs with forms
If there are other nested form dialogs inside other parent forms, we’ll replicate the same “stopPropagation on submit” pattern. But we’ll start with the one that’s breaking your workflow.
</implementation-steps>

<files-to-change>
- `src/components/companies/EditRepresentativeDialog.tsx`
  - Stop submit event propagation so parent Edit Company form can’t be submitted.
  - Add capture-phase stopPropagation on the Update Representative button for extra safety.
</files-to-change>

<test-plan>
1) Go to Companies → Edit a company (Edit Company dialog opens).
2) Click Representatives tab.
3) Click Edit on a representative.
4) Change any field → click “Update Representative”.

Expected:
- Toast: “Representative updated successfully”
- Edit Representative dialog closes
- Edit Company dialog stays open
- You remain on Representatives tab
- Critically: you do NOT see “Company updated successfully” anymore.

Regression:
5) Click “Update Company” (in Edit Company footer) still updates company and closes dialog as designed.
6) Delete Representative flow still works and keeps Edit Company open.
</test-plan>

<why-this-is-the-simple-direct-fix-you-asked-for>
You asked for “upon update, go back to Edit Company reps tab.”
The reason that doesn’t work is the app is already there — it’s just closing the whole Edit Company dialog immediately due to an unintended parent form submit.

Once we stop the nested submit from triggering the parent submit, the UI will naturally behave exactly as you described: save rep → close rep dialog → you’re still in Edit Company → Representatives tab.
</why-this-is-the-simple-direct-fix-you-asked-for>
