
## Show "PO Awarded" Indicator in Closed Bid Package Dialog

### The Goal

When a user opens a closed bid package in the `BidPackageDetailsModal`, they should be able to immediately see which company was awarded the contract (i.e., has an associated Purchase Order). Currently, there is no visual indicator — all companies look identical regardless of whether one was awarded a PO.

### The Approach

The cleanest approach is to fetch the Purchase Orders associated with the specific bid package when the modal opens. The `project_purchase_orders` table has a `bid_package_id` column that directly links back to the originating bid package. This avoids needing to join by cost code or project — it's a direct, reliable link.

The indicator will appear in the **company list within the modal**, specifically in the company's row, showing a green "PO Awarded" badge next to the company name for the company that received the PO.

### Data Flow

```text
BiddingTableRow (item.id = bid_package_id)
  └── BidPackageDetailsModal
        └── BiddingCompanyList
              └── BiddingCompanyRow
                    └── [NEW] "PO Awarded" badge if company has a PO
```

The PO data will be fetched in a new lightweight hook and passed down the chain.

### Technical Implementation

**Step 1 — New hook: `useBidPackagePO`** (`src/hooks/useBidPackagePO.ts`)

A simple `useQuery` that fetches POs for a given `bid_package_id`:

```ts
const { data } = await supabase
  .from('project_purchase_orders')
  .select('id, company_id, po_number, total_amount, status')
  .eq('bid_package_id', bidPackageId);
```

Returns an array of `{ company_id, po_number, total_amount }` for matched POs.

**Step 2 — Use the hook in `BidPackageDetailsModal`**

When `isReadOnly` is true (i.e., closed packages), call `useBidPackagePO(item.id)`. Pass the resulting PO list down to `BiddingCompanyList` as a new optional prop: `awardedPOs`.

**Step 3 — Pass through `BiddingCompanyList` → `BiddingCompanyRow`**

Add `awardedPOs` as an optional prop to both components and pass it along.

**Step 4 — Display the badge in `BiddingCompanyRow`**

In the **Company** cell, check if `awardedPOs` contains an entry matching `biddingCompany.company_id`. If so, render a green badge below the company name:

```tsx
<TableCell>
  <div className="flex flex-col gap-0.5">
    <span className="font-medium whitespace-nowrap">
      {biddingCompany.companies.company_name}
    </span>
    {awardedPO && (
      <Badge className="bg-green-100 text-green-700 text-xs w-fit">
        PO Awarded · {awardedPO.po_number}
      </Badge>
    )}
  </div>
</TableCell>
```

This places the badge directly under the company name — clean, unobtrusive, and immediately clear.

### Files to Change

- **NEW** `src/hooks/useBidPackagePO.ts` — Fetch POs linked to a specific bid package
- `src/components/bidding/BidPackageDetailsModal.tsx` — Call the hook when `isReadOnly`, pass `awardedPOs` to `BiddingCompanyList`
- `src/components/bidding/BiddingCompanyList.tsx` — Accept and pass `awardedPOs` prop to `BiddingCompanyRow`
- `src/components/bidding/components/BiddingCompanyRow.tsx` — Show the green "PO Awarded" badge in the Company cell

### What It Will Look Like

In the closed "Roofing" dialog, the DCF Contracting row will show:
- **DCF Contracting** (bold)
- `PO Awarded · 2026-XXXX-XXXX` (green badge, small text, beneath the name)

An Exterior, Inc. (no PO) will show only their name as before — no badge.
