## You're absolutely right

Two ~1,200-line table components rendering the same data is the root cause of the Description bug — and a guarantee of more divergence over time. Let's collapse them into one.

## What I found while scoping this

`BillsApprovalTable`'s props **already declare** `status: 'draft' | 'void' | 'posted' | 'paid' | Array<...>` — meaning it was built to handle the Approved (`posted`) tab too. Someone forked `PayBillsTable` instead of using it. So this is more of a **migration** than a rewrite.

The Approved tab has three things `BillsApprovalTable` doesn't currently expose, but they already exist in some form:
1. **Pay Bill action button per row** — `BillsApprovalTable` has a `showPayBillButton` prop already (line 109).
2. **Multi-select + batch Pay button** — only place this needs to be added to `BillsApprovalTable`.
3. **A different `useQuery` (filters by `status='posted'` plus join shape)** — needs to be unified.

## Plan: unify on `BillsApprovalTable`, retire `PayBillsTable`

### Step 1 — Make `BillsApprovalTable` handle `status='posted'` (Approved tab)
- Confirm the existing query at line 232 in `BillsApprovalTable.tsx` already filters by the `status` prop via `.in('status', statusArray)` (line 291) — it does. So passing `status="posted"` already returns the right bills.
- Add `dueDateFilter` and `filterDate` props (currently only on `PayBillsTable`) and apply them in the bills filter memo. Only used when `status === 'posted'`.
- Ensure the `bill_lines` select includes everything `PayBillsTable` selects (memos, project_lots, cost_codes, accounts) so PO matching + Description column work identically across tabs.

### Step 2 — Port the Approved-tab–only features into `BillsApprovalTable`
Gated behind `status === 'posted'` (or a small `showPaymentControls` derived flag):
- **Header checkbox + per-row checkboxes** for batch selection (reuse existing `MinimalCheckbox`).
- **"Pay Selected" button** above the table (rendered by the parent via the existing Header Action Bridge pattern, OR inline in the table — match what `PayBillsTable` does today at its toolbar).
- **Per-row Pay action** — already supported via `showPayBillButton`; just wire `PayBillDialog` open/close state inside `BillsApprovalTable` (it's already imported there for the Paid tab consolidation logic).
- **Credit badge** rendering on the vendor cell — port the small JSX block from `PayBillsTable` lines ~1015 (`bill.total_amount < 0` → "Credit" badge). Apply for all tabs since credits can appear anywhere.

### Step 3 — Switch the Approved tab over
In `BillsApprovalTabs.tsx` (lines 1091–1100), replace:
```tsx
<PayBillsTable projectId={...} ... />
```
with:
```tsx
<BillsApprovalTable
  status="posted"
  projectId={effectiveProjectId}
  projectIds={projectIds}
  showProjectColumn={false}
  enableSorting={true}
  searchQuery={searchQuery}
  showPayBillButton={true}
  dueDateFilter={dueDateFilter}
  filterDate={filterDate}
/>
```

### Step 4 — Delete `PayBillsTable.tsx`
- Search for any other importers of `PayBillsTable` and either remove the file or leave a `re-export` shim if anything outside the bills module uses it. (Spot-check: only `BillsApprovalTabs.tsx` imports it — safe to delete.)

### Step 5 — Verify all 4 tabs render identically
Same column order on every tab:
**Vendor | Cost Code | Bill Date | Due Date | Amount | Reference | Description | (Address?) | (Project?) | Files | Notes | PO Status | Pay Bill (Approved only) | Actions**

Tab-specific differences are purely:
- Which rows show up (driven by `status` prop + `dueDateFilter`)
- Which action buttons appear in the row (Approve/Reject for `draft`, Pay for `posted`, Edit for `void`/`paid`, etc. — already controlled by props)
- Multi-select / "Pay Selected" toolbar (only when `status === 'posted'`)

## Why this is safe-ish despite touching ~1,700 lines
- `BillsApprovalTable` is already the source of truth for 3 of the 4 tabs and was originally designed for all 4 (its type signature proves it).
- We're additively pulling features into it, not rewriting query shapes.
- The Paid tab's complex consolidation logic (payment groups, credit memos) already lives in `BillsApprovalTable` — we're not touching that.

## Files
- `src/components/bills/BillsApprovalTable.tsx` (additions: dueDateFilter/filterDate props, batch selection state + toolbar, PayBillDialog wiring, credit badge in vendor cell)
- `src/components/bills/BillsApprovalTabs.tsx` (swap component for the `approve` tab)
- `src/components/bills/PayBillsTable.tsx` (delete)

## Risks / things I'll watch
- Default sort: `PayBillsTable` defaults to bill_date asc; `BillsApprovalTable`'s sort defaults differ per tab. I'll preserve the Approved tab's current sort exactly.
- The "Approved" tab's specific handling of partially-paid credits — I'll port any logic that doesn't already exist in `BillsApprovalTable`.
- The PO matching hook (`useBillPOMatching`) is already used in both — same interface, no change needed.

## What you get
- One table component. One Description column. One Notes column. Forever.
- Future column changes happen in exactly one place.
- ~1,200 lines deleted (PayBillsTable.tsx) net of additions.
