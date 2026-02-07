
## What’s actually causing the “flash open then instantly closes + saves + kicks back to Companies page”
This behavior matches a classic HTML form issue:

- **Edit Company dialog contains a `<form>`** (`src/components/companies/EditCompanyDialog.tsx` line ~421).
- The **Representatives tab is rendered inside that same `<form>`**, including the Edit and Delete action buttons in `RepresentativeContent`.
- In HTML, a `<button>` inside a `<form>` defaults to **`type="submit"`** unless explicitly set.
- Your `Button` component (`src/components/ui/button.tsx`) does **not** set a default `type`, so the Edit icon button becomes a submit button.
- Your `DeleteButton` internally renders a `Button` without a `type`, so it also becomes a submit button when used inside a form.

So when you click **Edit** or **Delete** inside the Edit Company form:
1) the browser submits the company form,
2) `updateCompanyMutation` runs,
3) `onOpenChange(false)` fires on success (closing Edit Company),
4) you end up back on the main Companies page — **before** you can interact with Edit/Delete dialogs.

The nested Radix dialog event-handling improvements we attempted help with “outside click” issues, but **they cannot override a form submit** triggered by the browser.

---

## Fix approach (the correct fix)
Make sure any buttons inside the Edit Company form that are not intended to submit the company form are explicitly **`type="button"`**.

### Key principle
- Only the “Update Company” button should be `type="submit"`.
- Edit/Delete (and any icon/action buttons inside tabs) must be `type="button"`.

---

## Implementation steps

### 1) Fix the Edit (pencil) button so it never submits the parent form
**File:** `src/components/companies/RepresentativeSelector.tsx`

Change the Edit `<Button>` to include:
- `type="button"`

Keep your existing `stopPropagation` lines if you want (they won’t hurt), but **`type="button"` is the critical fix**.

**Result:** Clicking Edit will only open the Edit Representative dialog and will not trigger company save.

---

### 2) Fix DeleteButton so it never submits a surrounding form anywhere it is used
**File:** `src/components/ui/delete-button.tsx`

In the internal `<Button ...>` rendered by `DeleteButton`, add:
- `type="button"`

This is important because `DeleteButton` is used across the app (tables, dialogs, etc.). Setting `type="button"` makes it safe inside forms everywhere.

**Result:** Clicking Delete will only open the confirmation dialog and will not submit the Edit Company form.

---

### 3) (Optional but recommended) Ensure DeleteConfirmationDialog action buttons do not submit forms if ever used inside one
This is usually not necessary because Radix portals the alert dialog outside the form, but it’s a safe hardening step.

**File (optional):** `src/components/ui/delete-confirmation-dialog.tsx`
- Add `type="button"` to `AlertDialogAction` and `AlertDialogCancel` via props if desired.

---

## Test plan (end-to-end, matching your video)
1) Go to **Companies → Edit a Company → Representatives tab**
2) Click **Edit** on a representative:
   - Confirm you stay inside Edit Company
   - Confirm Edit Representative dialog stays open and is usable
   - Make a change and click **Update Representative**
   - Confirm Edit Representative dialog closes
   - Confirm you are still in the Edit Company dialog (Representatives tab)
3) Click **Delete** on a representative:
   - Confirm the confirmation dialog stays open
   - Click **Cancel** → nothing deletes
   - Click **Delete** → representative deletes, list refreshes, still inside Edit Company
4) Finally click **Update Company**:
   - Confirm company saves and the Edit Company dialog closes (expected)

---

## Files to change
- `src/components/companies/RepresentativeSelector.tsx` (set Edit button `type="button"`)
- `src/components/ui/delete-button.tsx` (set internal trigger button `type="button"`)
- Optional hardening:
  - `src/components/ui/delete-confirmation-dialog.tsx`

---

## Why this will resolve it
Because it prevents the browser’s default form submission behavior, which is what is currently firing the “save company + close dialog + return to Companies page” flow on any Edit/Delete click inside the Edit Company form.
