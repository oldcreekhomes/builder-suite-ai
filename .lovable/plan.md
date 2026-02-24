

## Filter Bid Notifications by Project Region and Representative Service Area

### Problem
When a company has representatives in different regions (e.g., one in DC, one in OBX), ALL representatives with `receive_bid_notifications` enabled receive every bid email -- even for projects outside their area. A DC rep shouldn't get bid invitations for an Outer Banks project, and vice versa.

### How It Works Today
- Projects already have a `region` field (e.g., "Washington, DC" or "Outer Banks, NC")
- Representatives already have a `service_areas` array (e.g., `["Washington, DC"]`)
- But when sending bid emails, the system only checks `receive_bid_notifications = true` -- it ignores the region match entirely

### Solution
Add service-area filtering at every point where bid recipients are selected. If a project has a region set, only include representatives whose `service_areas` array contains that region. If a project has no region, fall back to sending to all notification-enabled reps (current behavior).

### Changes

#### 1. Send Bid Package Modal (`src/components/bidding/SendBidPackageModal.tsx`)
- Fetch `service_areas` alongside other rep fields in the query (line 51-59)
- When building the recipients list, filter reps where `rep.service_areas` includes `projectData.region` (in addition to `receive_bid_notifications`)
- If the project has no region, skip the service area filter (backward compatible)

#### 2. Send Single Company Email Modal (`src/components/bidding/SendSingleCompanyEmailModal.tsx`)
- Same pattern: fetch `service_areas` in the rep query
- Filter reps by project region match

#### 3. Send Test Email Modal (`src/components/bidding/SendTestEmailModal.tsx`)
- Fetch `service_areas` in the rep query
- Apply same region-based filtering

#### 4. Send Bid Reminders Edge Function (`supabase/functions/send-bid-reminders/index.ts`)
- When fetching representatives (line 146-150), also select `service_areas`
- After fetching, filter reps where their `service_areas` array contains the project's region
- The project region is already available via `pkg.projects`

#### 5. No changes needed to:
- The `send-bid-package-email` edge function (it receives pre-filtered reps from the client)
- The `send-bid-submission-email` edge function (it sends to specific recipients, not bulk)
- The project or representative schemas (columns already exist)

### Filtering Logic (shared across all touchpoints)

```text
IF project.region IS NOT NULL:
  Include rep only if rep.service_areas CONTAINS project.region
ELSE:
  Include all reps with receive_bid_notifications = true (current behavior)
```

### Technical Details
- In client-side code, filtering uses: `!projectRegion || (rep.service_areas || []).includes(projectRegion)`
- In the reminders edge function, add `.contains('service_areas', [projectRegion])` to the Supabase query when region is available, or filter in JS after fetching
- The `service_areas` column on `company_representatives` is already a `text[]` type
- The `region` column on `projects` is already a `text` nullable type
