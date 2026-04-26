## Database-Only Updates for Project 214 N Granada

No code or UI changes — purely data updates via a migration on `project_purchase_orders` (and the project's PO counter).

### Verified Current State
| PO Number | ID | Amount | Action |
|---|---|---|---|
| 2026-214N-0002 | a9a8c3b1… | $1,000 (Architectural) | **Renumber → 2026-214N-0001** |
| 2026-214N-0003 | dc01c0a2… | $42,850 (test) | **DELETE** |
| 2026-214N-0004 | 2accd099… | $42,850 (Civil Engineering) | **Renumber → 2026-214N-0002** |

Verified: no `bill_lines` reference any of these POs, so deleting 0003 is safe. Its 28 `purchase_order_lines` will cascade-delete with the PO.

### Steps
1. **Delete** PO `dc01c0a2-c7dc-4653-9b0d-6b777f010089` (2026-214N-0003).
2. **Update** PO `a9a8c3b1-a6df-439e-be61-cf1152f7e146`: `po_number = '2026-214N-0001'`.
3. **Update** PO `2accd099-25de-4a92-8fd8-89e322011b97`: `po_number = '2026-214N-0002'`.
4. **Reset** `project_po_counters.current_number = 2` for project `b967fc5a-6ac6-4129-afe7-b67d51a5db05` so the next new PO becomes `2026-214N-0003`.

### End Result
- 2026-214N-0001 — Architectural — Good Life House Plans — $1,000
- 2026-214N-0002 — Civil Engineering — RC Fields & Associates — $42,850
