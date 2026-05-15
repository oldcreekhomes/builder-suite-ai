Fix the Edit Bill dialog so Quantity and Unit Cost fields behave like normal editable inputs.

Plan:
1. Update `src/components/bills/EditBillDialog.tsx` only.
2. Stop forcing grouped Job Cost inputs through `toFixed(2)` on every render while the user is typing. That formatting is what turns each keystroke into a reset/re-render and makes backspace/delete/cursor editing painful.
3. Add local edit-buffer state for grouped Job Cost Quantity and Unit Cost fields, so typed text stays exactly as entered while focused.
4. Commit the numeric value back to the grouped bill rows on change/blur without breaking the existing per-lot split math or total calculations.
5. Keep Expense tab fields as-is unless the same issue appears there, since they already bind directly to row string values.
6. Verify by opening the Edit Bill dialog and testing typing, backspace, delete, decimal entry, and replacing values in Quantity and Unit Cost.

Technical details:
- Root cause: grouped Job Cost fields render `value={group.quantity.toFixed(2)}` and `value={group.unitCost.toFixed(2)}` while also recalculating grouped rows on each change.
- Fix approach: preserve raw input strings during focus/editing, parse only for calculations, and only format when not actively editing if needed.
- No database migration and no unrelated code changes.