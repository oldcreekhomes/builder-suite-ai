## One-time DB cleanup: repoint 9 bill payments from Atlantic Union Bank to Capital One

**Project:** 126 Longview Drive, Alexandria, VA (`e5439be5-1658-4a0c-a6d1-c1e03d9eae68`)
**From:** Atlantic Union Bank — `27ed0c3a-be95-4367-aa21-1a2b51ea1585`
**To:** Capital One — `7b456e28-9eec-44cb-9f01-c745cc70867c`
**Date of payments:** 2026-06-05

### The 9 bill payments to update (matching the screenshot)

| Vendor | Amount | bill_payments.id |
|---|---:|---|
| ConApp Metro | $21,965.00 | 3fe0881b-1859-4817-b914-cbb1c70f0a2e |
| Torres Moreno Remodeling | $9,000.00 | 186585ac-2daa-45ee-85e6-801f3f9a3385 |
| Green Landscaping (Excavation) | $3,015.25 | 53316602-baae-4f52-afe5-1386bd6fe1cd |
| Green Landscaping (Excavation) | $2,719.00 | a160bf86-a663-4bf7-beac-22b3fed52fca |
| Green Landscaping (Labor) | $568.00 | 5078e1d7-f723-4c75-8211-b61516303ff3 |
| LCS Roll-off Services | $508.00 | 36b4df6f-c86e-4d99-b5f1-d04f9d9d6958 |
| Green Landscaping (Labor) | $505.00 | 60d845a7-881a-4e01-972f-160faa4afab4 |
| Raymond Zins (Gas) | $166.67 | 1eb9a8a7-c7c5-42f2-aed1-97bf4f50d733 |
| Raymond Zins (Gas) | $166.67 | 14b799a9-7893-4b15-b88d-ee9aaa7a872a |
| **Total** | **$38,613.59** | |

**Explicitly NOT touched** (also paid 6/5 from Atlantic Union but not in the screenshot):
An Exterior, Inc. $27,180 · Washington Gas $16.97

### Changes

1. `bill_payments.payment_account_id` → Capital One for the 9 IDs above.
2. The matching cash-side `journal_entry_lines` (the credits hitting `27ed0c3a…` on 2026-06-05 for these same 9 amounts) → `account_id` repointed to Capital One. All 9 are currently unreconciled, so this is safe.

No other transactions, reconciliations, bills, accounting periods, or settings are modified. No code changes.

### Verification after run
- Re-query: 9 bill_payments now show payment_account_id = Capital One.
- Re-query: 9 corresponding journal_entry_lines now credit Capital One; Atlantic Union no longer carries those credits on 6/5 for this project.