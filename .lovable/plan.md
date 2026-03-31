

## Fix: All Companies Checked Despite Being Already Sent

### Root Cause

The `email_sent_at` column was just added to `project_bids` — all existing records have `NULL`. The initialization logic treats `email_sent_at IS NULL` as "never sent," so every company gets checked even if the bid package was already sent (`sent_on` is set on the package).

### Fix

**1. Backfill existing data** (migration)

Set `email_sent_at = sent_on` for all `project_bids` rows whose parent `project_bid_packages` already has a `sent_on` date:

```sql
UPDATE project_bids pb
SET email_sent_at = pbp.sent_on
FROM project_bid_packages pbp
WHERE pb.bid_package_id = pbp.id
  AND pbp.sent_on IS NOT NULL
  AND pb.email_sent_at IS NULL;
```

**2. Add fallback logic in the initialization** (`src/components/bidding/SendBidPackageModal.tsx`)

In the `useEffect` that sets `selectedCompanyIds`, also check the package-level `sent_on` as a fallback. If the package has `sent_on` and the company has no `email_sent_at`, treat it as already sent (uncheck it):

```ts
useEffect(() => {
  if (!companiesData) return;
  const packageAlreadySent = !!bidPackage?.sent_on;
  const newSelected = new Set<string>();
  companiesData.forEach((company: any) => {
    const wasSent = company.email_sent_at || packageAlreadySent;
    if (!wasSent) {
      newSelected.add(company.company_id);
    }
  });
  setSelectedCompanyIds(newSelected);
}, [companiesData, bidPackage?.sent_on]);
```

**3. Show "Already sent" label using fallback date**

For the `alreadySent` flag and display date, fall back to the package's `sent_on` when `email_sent_at` is null:

```ts
const alreadySent = !!company.email_sent_at || !!bidPackage?.sent_on;
const sentDate = company.email_sent_at || bidPackage?.sent_on;
```

### Files Changed
- **Migration** — backfill `email_sent_at` from `project_bid_packages.sent_on`
- `src/components/bidding/SendBidPackageModal.tsx` — fallback logic for initialization and display

### Result
- Previously-sent companies are correctly unchecked by default
- The "Already sent on..." label shows the correct date
- Only newly added companies are auto-checked
- Users must explicitly re-check to resend

