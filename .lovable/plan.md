## Problem

The Edit Bill PO dropdown shows PO 2026-1E-0002 with label "2030 - Entitlement Engineering" for a bill line whose cost code is **2050: Civil Engineering**. The PO actually has three lines (2030, 2050, 2055) — so 2050 *does* match — but the dropdown labels the PO by its **header cost code** (2030), making it look wrong, and doesn't filter out POs that have zero lines matching the bill line's cost code.

## Fix — `src/components/bills/POSelectionDropdown.tsx` only

1. **Filter the PO list by the bill line's cost code.** When `costCodeId` is provided, only render POs that have at least one `line_items[].cost_code_id === costCodeId`. Auto-match and "No purchase order" stay. If none match, show only those two options.
2. **Label each PO by its matching line, not its header.** Replace `getPOLabel`/`getPOCostCodeLabel` cost-code display with the cost code of the matched line item (`po.line_items.find(l => l.cost_code_id === costCodeId)`). Amount shown becomes that line's `remaining / amount` so the user sees the right bucket. Fall back to current PO-header label when no `costCodeId` is supplied.
3. **`findMatchingPOForCostCode`** — update to search `po.line_items` for a matching cost code (not just `po.cost_code_id`), so auto-match works for multi-line POs too.
4. **Selected trigger display** — use the matched line's cost code label for the same reason.

No backend / hook changes. No DB changes. Behavior with single-cost-code POs is unchanged.

Approve and I'll implement.
