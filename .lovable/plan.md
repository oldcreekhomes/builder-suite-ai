

## Delete All Derrick Russell Homes Records for Fresh Testing

### What Gets Deleted
All data associated with Derrick Russell Homes (owner ID: `5d10b16a-3ffc-4ce2-b513-7990ac0de849`) and employee Jalin Hurts (`b63189c0-9c7e-47c6-bb3a-62b97d53fa3d`):

| Table | Count |
|---|---|
| cost_code_specifications | 74 |
| cost_codes | 298 |
| accounts | 14 |
| project_lots | 1 |
| projects | 1 |
| company_representatives | 2 |
| companies | 2 |
| user_roles | 2 |
| users (public) | 2 |
| auth.users | 2 |

No financial records (bills, checks, deposits, journal entries) exist, so this is a clean wipe.

### Approach
Create a temporary admin edge function that:
1. Deletes in dependency order (children first, parents last)
2. Uses the service role key to bypass RLS
3. Deletes both auth.users entries last (owner + employee)

The function will be deployed, executed once, then deleted.

### Deletion Order
1. `cost_code_specifications` (FK to cost_codes)
2. `project_lots` (FK to projects)
3. `cost_codes` (FK to owner_id)
4. `accounts` (FK to owner_id)
5. `company_representatives` (FK to companies)
6. `companies` (FK to home_builder_id)
7. `projects` (FK to owner_id)
8. `user_roles` (FK to user_id)
9. `users` (public table, both records)
10. `auth.users` (admin.deleteUser for both IDs)

### Result
Both `buildersuiteai1@gmail.com` (owner) and `jhurts@gmail.com` (employee) will be fully removed from the system, allowing a completely fresh re-registration and test.

