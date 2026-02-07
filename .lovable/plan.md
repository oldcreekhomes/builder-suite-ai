
<goal>
Make “Update Representative” behave as expected:
Save representative → close Edit Representative dialog → remain inside Edit Company dialog on the Representatives tab (no return to /companies).
</goal>

<what-is-actually-going-wrong>
Even though it “feels like navigation,” the app is almost certainly doing this:
1) Parent Edit Company dialog receives an “I should close now” signal (Radix outside-interaction / focus-outside / escape semantics).
2) CompaniesTable’s handler runs:
   onOpenChange={(open) => !open && setEditingCompany(null)}
3) editingCompany becomes null → EditCompanyDialog unmounts → you’re back on the Companies & Reps page.

So the bug is not “where to navigate after save” — it’s “stop the parent dialog from closing as a side-effect of interacting with the nested dialog.”
</what-is-actually-going-wrong>

<key-observation-from-the-code>
- EditCompanyDialog uses Radix <Dialog> and is controlled by CompaniesTable state (editingCompany).
- The nested EditRepresentativeDialog is portaled (Radix does this) and can be interpreted as “outside” the parent dialog’s content.
- We already hardened the shared DialogContent wrapper, but the close is still happening, which strongly suggests Radix is still finding a path to close the parent.
</key-observation-from-the-code>

<solution-overview>
Make the Edit Company dialog “explicit-close only”:
- Do not allow it to close via outside click, focus outside, or Escape.
- Only allow it to close from explicit actions (Cancel button, Save Company button, maybe an “X” close if you have one).

This aligns with the desired workflow: while editing a company and its reps, the modal shouldn’t disappear because of a nested modal interaction.

Additionally, make the Representatives tab controlled so it reliably stays on the tab the user is working in.
</solution-overview>

<implementation-steps>
Step 1 — Prevent Edit Company dialog from closing on outside interactions
File: src/components/companies/EditCompanyDialog.tsx

Change the parent <DialogContent> to block Radix close triggers:
- Add:
  - onPointerDownOutside={(e) => e.preventDefault()}
  - onInteractOutside={(e) => e.preventDefault()}
  - onFocusOutside={(e) => e.preventDefault()}
  - onEscapeKeyDown={(e) => e.preventDefault()}  (optional but recommended)

Result:
- The parent dialog cannot close due to nested dialog portal interactions.
- Closing is only via explicit UI actions we control.

Step 2 — Control the Edit Company active tab (so it stays on Representatives)
File: src/components/companies/EditCompanyDialog.tsx

Currently Tabs uses defaultValue="company-info" (uncontrolled).
Update to a controlled Tabs value:
- const [activeTab, setActiveTab] = useState<'company-info' | 'representatives' | 'insurance'>('company-info');
- <Tabs value={activeTab} onValueChange={setActiveTab} ...>

This ensures:
- If the user is on Representatives, they remain there after rep updates.
- If we ever need to force them back to Representatives (e.g., after opening/closing rep dialog), we can setActiveTab('representatives') safely.

Step 3 — Ensure representative updates only refresh the correct representative query key
File: src/components/companies/EditRepresentativeDialog.tsx

Right now, onSuccess invalidates:
- ['company-representatives']  (unscoped)

But RepresentativeContent fetches with:
- ['company-representatives', companyId]

Adjust invalidation to match the actual list query key (scoped by companyId), so the list refreshes reliably without touching anything unrelated:
- invalidateQueries({ queryKey: ['company-representatives', representative.company_id] })

This won’t fix the closing by itself, but it makes the “I saved, do I see my changes?” part consistent and avoids side effects.

Step 4 — Verify no other explicit close is firing
Files:
- src/components/companies/CompaniesTable.tsx (parent open/close)
- src/components/companies/EditCompanyDialog.tsx (parent dialog)
- src/components/companies/RepresentativeSelector.tsx (nested rep dialog launcher)

We’ll confirm:
- No code path calls the parent onOpenChange(false) as a side effect of representative save.
- The only onOpenChange(false) in rep edit closes the rep dialog (setEditingRep(null)), not the company dialog.

</implementation-steps>

<why-this-will-work>
- It removes the entire class of “parent closes because Radix thinks the nested portal is outside” by simply not allowing outside-driven closure at all on the Edit Company dialog.
- It matches the real-world expectation for an “Edit Company” workflow: users shouldn’t lose their place because they edited a nested entity.
- Controlled tabs ensure the UI reliably stays on “Representatives” after the nested dialog closes.
</why-this-will-work>

<test-plan>
1) Go to Companies → click Edit on a company.
2) Click “Representatives” tab.
3) Click Edit (pencil) on a representative.
4) Change First Name → click “Update Representative”.
Expected:
- Success toast appears.
- Edit Representative dialog closes.
- Edit Company dialog remains open.
- You are still on the Representatives tab.
- The list reflects the updated name.

Regression:
5) Click outside the Edit Company dialog: it should NOT close (by design after this change).
6) Press Escape: it should NOT close (by design after this change).
7) Save Company: should still close the dialog (explicit close path).
8) Cancel Company: should still close the dialog (explicit close path).
</test-plan>

<files-to-change>
- src/components/companies/EditCompanyDialog.tsx
  - Block outside/focus/escape close on DialogContent
  - Make Tabs controlled (activeTab state)

- src/components/companies/EditRepresentativeDialog.tsx
  - Fix query invalidation key to ['company-representatives', companyId]
</files-to-change>

<notes>
If you strongly want the Edit Company dialog to still close on outside click in other contexts, we can make this behavior conditional (e.g., only disable outside close while a nested rep dialog is open). But the simplest/most reliable fix is to make Edit Company explicit-close only.
</notes>
