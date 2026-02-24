

## Move Notes into Actions Dropdown and Reorder Menu Items

### Changes

#### 1. Remove the Notes column from the table

**`src/components/purchaseOrders/PurchaseOrdersTableHeader.tsx`**
- Remove the `<TableHead>Notes</TableHead>` column

**`src/components/purchaseOrders/components/PurchaseOrdersTableRowContent.tsx`**
- Remove the `<TableCell>` containing `<NotesEditor>` (lines 140-145)
- Pass `onUpdateNotes` and `item` info to `PurchaseOrdersTableRowActions` so it can open the notes dialog from the dropdown

#### 2. Add "Notes" as a dropdown action and reorder alphabetically

**`src/components/purchaseOrders/components/PurchaseOrdersTableRowActions.tsx`**
- Add `onNotesClick` prop (which opens the NotesEditor dialog)
- Reorder the actions alphabetically (excluding Cancel):
  1. Edit
  2. Notes
  3. Send Purchase Order
  4. Send Test Email
  5. --- separator ---
  6. Cancel Purchase Order (destructive, stays at bottom)

#### 3. Move NotesEditor dialog trigger into the row actions

Since the NotesEditor is currently a standalone dialog triggered by a button, we need to control it from the actions dropdown. The simplest approach:

- In `PurchaseOrdersTableRowContent`, keep the `NotesEditor` component rendered but hidden (no visible trigger), controlled by a state variable
- Add a `notesOpen` state, pass `onNotesClick={() => setNotesOpen(true)}` to the row actions
- Render the NotesEditor dialog with `open={notesOpen}` / `onOpenChange={setNotesOpen}` props

This requires a small update to `NotesEditor` to accept optional `open` and `onOpenChange` props for external control.

### Summary of final dropdown order

```text
Edit
Notes
Send Purchase Order
Send Test Email
─────────────────
Cancel Purchase Order  (red/destructive)
```

