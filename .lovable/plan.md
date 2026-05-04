## The Problem

Today, `AddCompanyDialog` requires a representative for every company. That's appropriate for plumbers, electricians, framers, and other trade partners we actually communicate with — but it's wasteful for places like Home Depot, CVS, the gas station, or any "walk‑in / pay‑the‑bill" vendor. Users end up inventing fake people just to satisfy the form.

The schema already supports this. `company_representatives` has no NOT NULL relationship from `companies` — the requirement is purely a UI rule in `AddCompanyDialog.tsx` (lines 433–453) and the inline `InlineRepresentativeForm`.

## Recommended Fix

Add a single classification on the company called **"Engagement Type"** with two values:

- **Trade Partner** — we send bids, POs, schedule notifications. **At least one representative required.**
- **Supplier / Retail** — we just buy from them or pay bills. **No representative required.**

This is one extra field, one branch of validation, and zero fake humans.

### Why a new field instead of inferring from `company_type`?

`company_type` is a long taxonomy (200+ values like "Plumbing Contractor", "Lumber Yard", "Hardware Supplier"). Trying to auto-decide from that list will be wrong constantly (e.g., some lumber yards we DO bid; some "contractors" we never talk to). Letting the user pick once, per company, is honest and explicit.

### UX

In **Add Company** dialog:
1. Near the top, add a small toggle / segmented control:
   - ◉ Trade Partner (we bid, schedule, send POs)
   - ◯ Supplier / Retail (we just buy or pay bills)
2. Default to **Trade Partner** (preserves current behavior for the common case).
3. When **Supplier / Retail** is selected:
   - Hide the inline representative form section
   - Hide the "Cost Codes" requirement too (also pointless for CVS) — make optional
   - Skip representative validation on submit
4. When **Trade Partner** is selected: behavior is unchanged from today.

In **Edit Company** dialog: same toggle, with the same hide/show behavior. Switching an existing company to "Supplier / Retail" leaves any existing reps in place (non-destructive) but they become optional.

In the **Companies table**: show a small badge ("Trade" / "Supplier") so users can see at a glance which is which, and filter by it.

### Where reps still matter

Anywhere we currently iterate reps (bidding lists, PO sends, schedule notifications), Suppliers simply won't appear because they have no reps — which is the correct behavior. No additional gating logic needed.

## Technical Changes

**Database (migration)**
- Add column `companies.engagement_type text not null default 'trade_partner'` with check constraint `in ('trade_partner','supplier')`.
- Backfill: existing companies stay `trade_partner` (no behavior change).

**Frontend**
- `src/components/companies/AddCompanyDialog.tsx`
  - Add `engagement_type` to `companySchema` and form defaults.
  - Render segmented control above the tabs.
  - Conditionally render `InlineRepresentativeForm`.
  - In `onSubmit`, skip rep validation + skip cost-code-required check when `engagement_type === 'supplier'`.
  - Pass `engagement_type` into the `companies` insert.
- `src/components/companies/EditCompanyDialog.tsx` — same toggle + conditional rep section.
- `src/components/companies/CompaniesTable.tsx` — add a "Type" badge column (Trade / Supplier) and a filter.
- `src/components/companies/CompaniesExcelImportDialog.tsx` — accept an optional "Engagement Type" column; default to trade_partner; if supplier, don't require rep columns.
- `src/integrations/supabase/types.ts` — regenerated automatically.

**No changes needed** to bidding, PO, or schedule code — those already iterate `company_representatives`, which will just be empty for suppliers.

## Out of Scope (can be follow-ups)

- Bulk re-classifying existing companies (users can edit individually, or we can add a bulk action later).
- Auto-suggesting engagement type from `company_type` keywords.

---

Approve this and I'll implement the migration + the three dialog/table updates.