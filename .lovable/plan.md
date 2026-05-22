One-time data update — no code, no emails:

Update `project_purchase_orders.total_amount` for two POs on project 103E Oxford:

- `2026-103E-0008` (4340 Floor Joists): `12334.12` → `12334.13`
- `2026-103E-0009` (4330 Lumber & Framing Material): `40504.11` → `40504.13`

Also bump `updated_at = now()` on both rows. No `purchase_order_lines` rows exist for these POs, so nothing else to sync.