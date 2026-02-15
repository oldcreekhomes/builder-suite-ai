

## Reset Company Profile for Derrick Russell Homes

To allow you to retest the "Set Up Company Profile" onboarding step, two updates are needed:

### 1. Clear the HQ address from the users table
Set `hq_address`, `hq_city`, `hq_state`, `hq_zip`, `hq_lat`, and `hq_lng` back to `NULL` for Derrick Russell Homes so the live detection will see the profile as incomplete.

### 2. Reset the onboarding flag
Set `company_profile_completed` to `false` in the `onboarding_progress` table.

### SQL to Execute

```text
-- Clear HQ address data
UPDATE users 
SET hq_address = NULL, hq_city = NULL, hq_state = NULL, 
    hq_zip = NULL, hq_lat = NULL, hq_lng = NULL
WHERE id = '5d10b16a-3ffc-4ce2-b513-7990ac0de849';

-- Reset onboarding flag
UPDATE onboarding_progress 
SET company_profile_completed = false, updated_at = now()
WHERE home_builder_id = '5d10b16a-3ffc-4ce2-b513-7990ac0de849';
```

After this, when Derrick Russell Homes loads their dashboard, the onboarding checklist will show "Set Up Company Profile" as incomplete with a link to go complete it.

