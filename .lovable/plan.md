

## Merge 2405 N Potomac into 2401 N Potomac

**Surviving project**: 2401 (`350e5951`) — it has more files (855 vs 787), more folders (34 vs 26), and more bid packages (6 vs 3).

**What moves from 2405 → 2401**:

| Data | 2405 Count | Action |
|------|-----------|--------|
| Files | 787 | Reassign `project_id` to 2401 |
| Folders | 26 (8 overlap with 2401) | Only create the 18 unique folders; skip the 8 duplicates |
| Photos | 73 | Reassign `project_id` to 2401 |
| PO | 1 (2025-2405N-0001, same vendor/cost code as 2401's PO) | Reassign `project_id` to 2401 |
| Bid packages | 3 (all 3 share the same cost codes as existing 2401 packages) | Skip — duplicates already exist in 2401 |
| Bills | 0 | Nothing to move |
| Lots | Currently 3 each → update 2401 to 6 total | Add lots 4, 5, 6 |

**Folder overlap detail** — these 8 folders exist in both projects and will NOT be re-created:
- Corporate Documents, Drawings, Drawings/Old Drawings - DON'T USE, Entitlement, Lawsuit, Lawsuit/Complaint, Permit Submissions, Utilities

The 18 unique 2405 folders (like `Entitlements`, `Utilities/New Connections`, etc.) will be created fresh in 2401.

**Bid packages**: All 3 in 2405 (codes 4500, 2100, 2050) already exist in 2401 with the same cost codes. I'll skip them to avoid duplicates. Any bids attached to 2405's packages will be reassigned to the matching 2401 packages.

### Implementation Steps

1. **Update 2401's `total_lots` to 6** and create lot records 4, 5, 6
2. **Reassign 2405's files** — UPDATE `project_files` SET `project_id = 2401's id` WHERE `project_id = 2405's id`
3. **Create only non-duplicate folders** — INSERT the 18 folders unique to 2405 into 2401
4. **Reassign 2405's photos** — UPDATE `project_photos` SET `project_id = 2401's id`
5. **Reassign 2405's PO** — UPDATE `project_purchase_orders` SET `project_id = 2401's id`
6. **Reassign bids** from 2405's bid packages to matching 2401 bid packages (same cost_code_id)
7. **Update 2401's address** to reflect the combined project (e.g., "2401-2405 N Potomac Street")
8. **Clean up**: Delete 2405's now-empty bid packages, duplicate folders, schedule tasks, lots, and finally the project record itself

All of this is data operations (UPDATE/INSERT/DELETE) executed via the Supabase insert tool — no schema migrations needed. No code changes required.

