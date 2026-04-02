

## Reallocate PO 2026-100N-0014 from 4200 to 3340

### What's changing
PO for LCS Site Services ($284,543.30) is currently on cost code **4200** (Excavation, Backfill & Grading). It needs to move to **3340** (Earthwork).

### Data updates (5 database operations)

1. **Purchase Order** (`project_purchase_orders`): Update `cost_code_id` from 4200 → 3340
2. **PO Line Item** (`purchase_order_lines`): Update the single line's `cost_code_id` from 4200 → 3340
3. **Bid Package** (`project_bid_packages`): Update the linked bid package's `cost_code_id` from 4200 → 3340
4. **Budget for 3340**: Update existing row to `budget_source: 'purchase-orders'` and `unit_price: 14975.96` (matching the PO allocation)
5. **Budget for 4200**: Reset to `budget_source: 'manual'` and `unit_price: 0` since the PO is being removed from this code

### What's NOT affected
- No bills are linked to this PO, so no bill line or journal entry changes needed
- The PO number stays the same — no vendor notification triggered

### IDs reference
- Project: `691271e6-e46f-4745-8efb-200500e819f0`
- PO: `f2110af9-eb0a-4f02-bbe8-2d9f798ab8b6`
- PO Line: `834733b4-dca9-4183-af83-ad4a7a17b7dc`
- Bid Package: `e1ebf73b-ba72-42df-91ac-64bbbdf97fae`
- Cost code 3340 (Earthwork): `5aef3665-9d65-4402-893c-1e0a1ac9f15c`
- Cost code 4200 (Excavation): `3461c8ce-6ec5-4466-a164-1640e042efb7`
- Budget 4200: `c686175a-bded-4318-9405-dd88af103c4c`
- Budget 3340: `8aa7b3e6-8c45-4c43-b799-4162be1e3545`

