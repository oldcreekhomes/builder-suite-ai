# Plan: Make the Cost Code / Account switch obvious in the Multiple Checks header

## Problem
The Multiple Checks page has a header Select that toggles whether each row posts to a **Cost Code** or an **Account**, but in the header it only displays the current value (e.g. "Cost Code"). Users do not realize this is the switch between the two modes.

## Goal
Make the control in the card header clearly and unmistakably choose between "Cost Code" and "Account", while keeping the per-row Type column removed.

## Changes

### 1. Replace the header Select with a labeled, two-option control
- Keep the existing `entryType` state and `handleEntryTypeChange` behavior (clears stale row selections when switching).
- Change the header control so it visibly presents both choices.
- Recommended approach: a shadcn/ui `Select` with an explicit inline label, e.g.:
  - Label text: "Post as"
  - Trigger text shows the selected option: "Cost Code" or "Account"
  - Dropdown items remain "Cost Code" and "Account"
- Alternatively, if the user prefers a toggle-style control, use two shadcn `Button`/`ToggleGroup` options side-by-side: "Cost Code" | "Account".

### 2. Dynamic table column header
- Keep the current behavior where the table's sixth column header changes from "Cost Code" to "Account" based on the selected mode.

### 3. Row picker placeholders
- Update the cost-code picker placeholder to "Select cost code…" and the account picker placeholder to "Select account…" (already present; confirm they stay).

### 4. Styling
- Use shadcn/ui defaults only (project memory UI Standardization).
- Keep the control compact so it fits in the existing header next to Default Date, Total, and the Actions menu.

## Verification
- Build passes.
- Header control clearly shows both modes are available.
- Switching the header control updates the column header and clears the rows' previous cost-code/account selections.
- Save behavior remains unchanged.
