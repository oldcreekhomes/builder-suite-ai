

## Fix Marketplace: Per-Region Supplier Counts + Grant OBX Access to Old Creek Homes

### Problem 1: "0 suppliers" display
The service area bar shows a single count (`tableCounts.filteredCount`) which only reflects the filtered count for the currently selected category. Before any category is selected, it shows "0 suppliers" which is confusing. The count should show how many suppliers exist **per region** regardless of category selection.

### Problem 2: Old Creek Homes needs OBX access
The `marketplace_subscriptions` table is currently empty, so every user defaults to `["Washington, DC"]` only. Old Creek Homes (owner_id: `2653aba8-d154-4301-99bf-77d559492e19`) needs both "Washington, DC" and "Outer Banks, NC".

### Problem 3: Console error in UpgradeMarketplaceModal
Minor `forwardRef` warning from `DialogHeader` -- harmless but worth fixing.

---

### Changes

**1. Show per-region counts in the service area bar (`src/pages/Marketplace.tsx`)**
- Query `marketplace_companies` to get counts grouped by service area (a lightweight count query)
- Display the count next to each region badge, e.g. "Washington, DC (2,208)" and "Outer Banks, NC (30)"
- Remove the single "X suppliers" text on the right side of the bar, or keep it as the active region's count

**2. Insert subscription row for Old Creek Homes (data operation)**
- Insert into `marketplace_subscriptions`:
  - `owner_id`: `2653aba8-d154-4301-99bf-77d559492e19`
  - `allowed_service_areas`: `["Washington, DC", "Outer Banks, NC"]`
  - `status`: `active`

**3. Fix DialogHeader ref warning (`src/components/marketplace/UpgradeMarketplaceModal.tsx`)**
- Wrap `DialogHeader` usage properly or suppress the ref warning (minor cleanup)

---

### Technical Details

**Per-region counts query** -- Add a separate `useQuery` in `Marketplace.tsx`:
```typescript
const { data: regionCounts } = useQuery({
  queryKey: ['marketplace-region-counts'],
  queryFn: async () => {
    const { data } = await supabase
      .from('marketplace_companies')
      .select('service_areas');
    // Count per region client-side since service_areas is an array
    const counts: Record<string, number> = {};
    SERVICE_AREA_OPTIONS.forEach(a => counts[a] = 0);
    data?.forEach(c => {
      (c.service_areas || []).forEach((area: string) => {
        if (counts[area] !== undefined) counts[area]++;
      });
    });
    return counts;
  },
});
```

Then display in the badge: `{area} ({regionCounts?.[area] ?? 0})`

**Data insert** for Old Creek subscription -- executed via edge function or admin tool.

