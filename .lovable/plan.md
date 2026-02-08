

# Geo-Gated Marketplace Access Model

## Business Logic Summary

The marketplace is a two-sided platform connecting home builders/GCs with suppliers. Information is valuable and access must be controlled:

| Access Tier | Radius | Cost |
|-------------|--------|------|
| **Free** | 30 miles from company HQ | Included |
| **Paid** | Beyond 30 miles (any location) | Subscription/fee required |

When Old Creek Homes (HQ in Alexandria, VA) searches the marketplace:
- **Free**: See all suppliers within 30 miles of Alexandria
- **Blocked**: Suppliers 31+ miles away are hidden or locked until payment

---

## Current State Analysis

### What Exists
- Distance calculation infrastructure (`calculate-distances` edge function)
- `useDistanceFilter` hook for radius-based filtering
- Google Maps Distance Matrix API integration
- Multi-tenant data isolation via RLS

### What's Missing
1. **Company HQ Address** - The `users` table has `company_name` but no address fields
2. **Subscription/Tier System** - No tables for tracking paid status
3. **Marketplace Access Control** - Currently all data is visible to authenticated users
4. **Geo-filtering UI** - No radius slider or upgrade prompts

---

## Part 1: Database Changes

### 1.1 Add HQ Address to Users Table

```sql
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS hq_address TEXT,
ADD COLUMN IF NOT EXISTS hq_city TEXT,
ADD COLUMN IF NOT EXISTS hq_state TEXT,
ADD COLUMN IF NOT EXISTS hq_zip TEXT;
```

### 1.2 Create Subscription Tracking Table

```sql
CREATE TABLE public.marketplace_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  max_radius_miles INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id)
);

-- Enable RLS
ALTER TABLE public.marketplace_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can view own subscription"
ON public.marketplace_subscriptions FOR SELECT
USING (owner_id = auth.uid());

-- Only system can modify (via edge functions)
CREATE POLICY "Service role can manage subscriptions"
ON public.marketplace_subscriptions FOR ALL
USING (auth.role() = 'service_role');
```

### Subscription Tiers

| Tier | Max Radius | Monthly Cost | Features |
|------|------------|--------------|----------|
| **Free** | 30 miles | $0 | Local suppliers only |
| **Pro** | 100 miles | $29/mo | Regional access |
| **Enterprise** | Unlimited | $99/mo | National access + API |

---

## Part 2: UI Changes

### 2.1 Company Profile Settings

Add new "Company Profile" tab to Settings page for HQ address:

```
┌─────────────────────────────────────────────────┐
│ Company Headquarters                             │
├─────────────────────────────────────────────────┤
│ Street Address                                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ 123 Main Street                             │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ City            State       ZIP                  │
│ ┌─────────────┐ ┌─────────┐ ┌─────────┐        │
│ │ Alexandria  │ │ VA      │ │ 22301   │        │
│ └─────────────┘ └─────────────────────┘        │
│                                                  │
│ This address determines your free marketplace   │
│ search radius (30 miles).                       │
│                                                  │
│ [Save Address]                                  │
└─────────────────────────────────────────────────┘
```

### 2.2 Marketplace Page Geo-Filter Header

Add radius control slider at the top of the marketplace:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🏢 Marketplace                                                       │
│                                                                      │
│ Your HQ: Alexandria, VA                                              │
│                                                                      │
│ Search Radius: ●━━━━━━━━━━━━━━━━━━━━━━━━━○━━━━━━━━━━━━━━━━━━━━━○    │
│                30 mi                    100 mi                 ∞     │
│                FREE                     🔒 PRO              🔒 ENTERPRISE │
│                                                                      │
│ Showing 47 suppliers within 30 miles                [Upgrade →]     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Upgrade Modal

When user tries to access beyond free tier:

```
┌─────────────────────────────────────────────────────┐
│                 Expand Your Reach                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Your free plan includes suppliers within           │
│  30 miles of your headquarters.                     │
│                                                      │
│  Upgrade to access suppliers across your            │
│  entire region or nationwide.                       │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                │
│  │     PRO      │  │  ENTERPRISE  │                │
│  │   $29/mo     │  │    $99/mo    │                │
│  │  100 miles   │  │   Unlimited  │                │
│  │              │  │   + API      │                │
│  │  [Select]    │  │   [Select]   │                │
│  └──────────────┘  └──────────────┘                │
│                                                      │
│              [Continue with Free]                   │
└─────────────────────────────────────────────────────┘
```

---

## Part 3: Data Flow

### How Filtering Works

```
1. User opens Marketplace
         ↓
2. Fetch user's subscription tier & HQ address
         ↓
3. Determine max allowed radius (30/100/unlimited)
         ↓
4. Calculate distance from HQ to each marketplace company
         ↓
5. Filter companies to only show those within allowed radius
         ↓
6. Display filtered results with upgrade prompts if applicable
```

### Distance Calculation Strategy

**Option A: Pre-calculated (Recommended)**
- Store distance from major metros in `marketplace_companies` table
- Add columns: `distance_dc`, `distance_baltimore`, etc.
- Query uses simple column comparison

**Option B: Real-time calculation**
- Use existing `calculate-distances` edge function
- More accurate but slower and API costs per search
- Better for Pro/Enterprise tiers with custom addresses

---

## Part 4: Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/components/settings/CompanyProfileTab.tsx` | HQ address editor |
| `src/components/marketplace/MarketplaceRadiusControl.tsx` | Radius slider UI |
| `src/components/marketplace/UpgradeMarketplaceModal.tsx` | Tier upgrade prompt |
| `src/hooks/useMarketplaceSubscription.ts` | Subscription state hook |
| `src/hooks/useCompanyHQ.ts` | HQ address hook |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Add Company Profile tab |
| `src/pages/Marketplace.tsx` | Add radius control header |
| `src/components/marketplace/MarketplaceCompaniesTable.tsx` | Filter by distance |
| `src/integrations/supabase/types.ts` | Add new table types |

---

## Part 5: Implementation Order

1. **Database migration** - Add HQ fields + subscription table
2. **Company Profile tab** - Allow users to set HQ address
3. **useCompanyHQ hook** - Fetch/update HQ address
4. **useMarketplaceSubscription hook** - Track tier and limits
5. **MarketplaceRadiusControl component** - Slider UI with tier indicators
6. **Update Marketplace page** - Integrate geo-filtering
7. **UpgradeMarketplaceModal** - Payment/upgrade flow
8. **Stripe integration** - Connect to payment processing

---

## Part 6: First-Time User Experience

When a new user accesses Marketplace with no HQ address set:

```
┌─────────────────────────────────────────────────────┐
│           Set Up Your Headquarters                   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  📍 To browse the marketplace, we need to know      │
│     where your company is located.                  │
│                                                      │
│  Enter your business address to see suppliers       │
│  within 30 miles (free):                           │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🔍 Search for address...                    │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│                   [Continue]                        │
└─────────────────────────────────────────────────────┘
```

---

## Technical Notes

### Distance Calculation Optimization

For the free tier (30-mile radius), we can pre-filter in SQL if we geocode HQ addresses:

```sql
-- Add lat/lng to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS hq_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS hq_lng DOUBLE PRECISION;

-- Add lat/lng to marketplace_companies (populated from Google Places)
ALTER TABLE public.marketplace_companies
ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Haversine distance function for fast filtering
CREATE OR REPLACE FUNCTION calculate_distance_miles(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
  SELECT 3959 * acos(
    cos(radians(lat1)) * cos(radians(lat2)) * 
    cos(radians(lng2) - radians(lng1)) + 
    sin(radians(lat1)) * sin(radians(lat2))
  );
$$ LANGUAGE SQL IMMUTABLE;
```

This allows server-side filtering without API calls for every search.

### Stripe Integration Notes

The payment flow would use the existing Stripe tooling:
1. Enable Stripe connector
2. Create Products for Pro/Enterprise tiers
3. Use Stripe Checkout for subscription signup
4. Webhook updates `marketplace_subscriptions` table

---

## Summary

This plan establishes a geo-gated monetization model where:

1. **Free users** see suppliers within 30 miles of their registered HQ
2. **Paid users** unlock regional (100mi) or national access
3. **No HQ = No access** forces users to provide location data
4. **Distance filtering** leverages existing infrastructure
5. **Stripe integration** handles subscription billing

The value proposition is clear: pay to access more suppliers beyond your local area.

