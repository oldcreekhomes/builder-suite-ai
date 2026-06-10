Plan to update this only after you approve:

1. Replace the PO info icon behavior inside the bill edit dialogs so it opens the existing shared **PO Status Summary** dialog instead of the separate PO details popup.

2. Wire the same shared dialog into both places where bill line PO info is shown:
   - regular bill edit dialog
   - extracted/pending bill edit dialog

3. Keep the current PO selection dropdown, matching logic, and save behavior unchanged.

4. Leave the old PO details dialog file in place only if it still has other app consumers, but stop using it from these bill edit flows.

Result: the information icon will use the same **PO Status Summary** dialog across the application, so we are editing/maintaining one dialog style instead of two.