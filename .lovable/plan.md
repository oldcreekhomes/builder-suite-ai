
<context>
Current behavior: Updating a representative inside Edit Company → Representatives tab still closes the parent Edit Company dialog and drops you back to /companies, even after:
- removing ['companies'] invalidations for representative mutations (delete path now OK),
- setting modal={false} on the nested Edit Representative dialog (companies/EditRepresentativeDialog.tsx),
- adding data-radix-dialog-content / data-radix-alert-dialog-content markers (dialog.tsx / alert-dialog.tsx).

Key observation from the codebase:
- The Edit Company dialog is a Radix Dialog (modal) controlled by CompaniesTable state:
  - open={!!editingCompany}
  - onOpenChange={(open) => !open && setEditingCompany(null)}
So if the parent Radix dialog fires onOpenChange(false) for any reason (outside interaction/focus outside/escape), CompaniesTable clears editingCompany and the app “returns to the Companies page”.
</context>

<what-we-learned-from-code>
1) There are two different EditRepresentativeDialog components:
   - src/components/companies/EditRepresentativeDialog.tsx (used by EditCompanyDialog via RepresentativeSelector.tsx)
   - src/components/representatives/EditRepresentativeDialog.tsx (separate, includes other query invalidations and is not modal={false})
   The one actually used in the Edit Company Representatives tab is:
   - RepresentativeSelector.tsx imports: `import { EditRepresentativeDialog } from "./EditRepresentativeDialog";`
   So the problem is in the nested Radix dialog interaction between:
   - Parent: EditCompanyDialog (Radix Dialog, modal)
   - Child: companies/EditRepresentativeDialog (Radix Dialog, modal={false})

2) Our global DialogContent wrapper (src/components/ui/dialog.tsx) currently guards ONLY `onInteractOutside`.
   However, Radix can close dialogs based on:
   - onPointerDownOutside
   - onFocusOutside
   - (and then also triggers onInteractOutside)
   In nested portal scenarios, it’s common for the parent to be closed by pointer-down-outside or focus-outside semantics before our onInteractOutside guard is sufficient.

This explains why the issue can persist even with the marker attributes and onInteractOutside guard in place.
</what-we-are-going-to-change>
Goal: Make the parent dialog reliably ignore ALL “outside” signals that originate from within any other dialog/alert-dialog content (i.e., from a nested portal), not just the generic onInteractOutside.

We will harden src/components/ui/dialog.tsx so it prevents parent dialog closure for nested dialogs at the earliest relevant hooks:
- onPointerDownOutside
- onFocusOutside
- onInteractOutside (keep as a fallback)

This is an app-wide fix that should stabilize all nested Radix dialogs, not just the Company/Representative flow.
</what-to-implement>
Step 1: Update DialogContent wrapper to guard pointer-down-outside and focus-outside
File: src/components/ui/dialog.tsx

Implementation details:
- In the DialogPrimitive.Content props destructuring, also pick up:
  - onPointerDownOutside
  - onFocusOutside
  - onInteractOutside (already present)
- Implement a shared helper inside the component, e.g.:
  - `shouldBlockOutsideEvent(target: HTMLElement | null): boolean`
  - returns true if target is inside:
    - `[data-radix-dialog-content]` OR
    - `[data-radix-alert-dialog-content]` OR
    - (optional) other portaled Radix overlays if needed later

- Wire it to all three handlers:
  1) onPointerDownOutside:
     - if shouldBlockOutsideEvent(e.target as HTMLElement | null) => e.preventDefault(); return;
     - else call the user-provided onPointerDownOutside if any
  2) onFocusOutside:
     - same logic
  3) onInteractOutside:
     - keep existing logic, but align it with the shared helper to avoid divergence

Why this matters:
- Even if onInteractOutside is called, by then the dialog may already be in a closing flow; blocking earlier events is the reliable nested-modal pattern.

Step 2: Verify we still set the marker attribute on dialog content
File: src/components/ui/dialog.tsx
- Keep: `data-radix-dialog-content=""` on DialogPrimitive.Content (already added)
This is required so `closest('[data-radix-dialog-content]')` can detect nested dialog content.

Step 3 (only if needed after testing): Extend the “nested overlay” allowlist
If the representative dialog uses other portaled components (Select/Popover/Dropdown), those can also trigger parent “outside” events. If we still reproduce the issue after Step 1, we will extend detection to include:
- `[data-radix-select-content]`
- `[data-radix-popover-content]`
- `[data-radix-dropdown-menu-content]`
This would be done in the same shared helper in dialog.tsx.

We will not add these until we confirm they are necessary, to avoid unintentionally blocking legitimate outside clicks.
</what-we_will_not_change>
- We will not change routing or add manual navigation hacks.
- We will not change CompaniesTable open-state logic, because the dialog should not be closing in the first place.
- We will not reintroduce invalidation of ['companies'] on representative updates.
</what_success_looks_like>
After the change:
- Edit Company dialog remains open.
- User clicks Edit on a rep → nested dialog opens.
- User clicks Update Representative → save succeeds → nested dialog closes.
- User is still in Edit Company dialog on the Representatives tab.
- No redirect/return to the Companies page.
</test_plan>
1) Go to /companies
2) Click Edit on a company → Edit Company dialog opens
3) Click Representatives tab
4) Click Edit (pencil) on any representative
5) Change a field and click “Update Representative”
   Expected:
   - Toast: “Representative updated successfully”
   - Edit Representative dialog closes
   - Edit Company dialog remains open on Representatives tab

Regression:
6) Click outside the Edit Company dialog (true outside) → it should close normally
7) Delete representative flow still returns you to Edit Company → Representatives tab
8) Interact with Select controls inside the representative dialog (Type dropdown) and save again
</test_diagnostics_if_it_still_fails>
If it still closes after Step 1:
- We’ll capture console logs during the click/save (to see whether parent onSubmit is firing or any unexpected onOpenChange triggers).
- We’ll likely need Step 3 (add select/popover/dropdown content selectors to the nested-overlay allowlist), because Radix Select’s portaled content can be interpreted as outside interaction for the parent dialog.
</test_scope_and_risk>
- Low risk: changes are contained to the shared dialog wrapper and only affect “outside interactions” behavior.
- Intended outcome: parent dialogs become more stable when nested dialogs/overlays are used.
</testables>
Files to change:
- src/components/ui/dialog.tsx
No other files are required for the first pass.
