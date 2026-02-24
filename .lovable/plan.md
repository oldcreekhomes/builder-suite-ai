
Problem restated in plain language:
- You expect every company to always show one of only two service areas when editing: “Washington, DC” or “Outer Banks, NC”.
- Right now some companies (including Kat & Mat Electrical Services and Dulles Geotechnical) open with both boxes blank, which breaks your workflow.

What I verified from your live data and code:
1) The checkbox UI is working; it checks only when `selectedAreas` contains exact canonical values.
2) For the two companies you named, the database currently has empty service areas:
   - Kat & Mat Electrical Services → `service_areas = []`
   - Dulles Geotechnical… → `service_areas = []`
3) Legacy “Northern Virginia” values were already migrated, so this is no longer a label-mapping issue.
4) The real root cause is historical data population:
   - earlier migration auto-filled from `state`, but many companies have `state = null` while the full address text contains `VA`/`NC`.
   - result: many records stayed empty.
5) There are still many blank records (`service_areas = []`) in `companies`, so this is systemic, not just two rows.

Do I know what the issue is?
- Yes. The dialog is blank because those records truly have no service area stored, and current dialog initialization does not apply a mandatory fallback when empty.

Implementation plan to make this fully reliable:

1) Enforce canonical + fallback logic in one shared utility
- File: `src/lib/serviceArea.ts`
- Add helpers:
  - `inferServiceAreaFromAddress({ state, city, address_line_1, address })`
  - `getCompanyServiceAreasOrDefault(company)` that returns:
    - normalized existing values when present
    - otherwise inferred value from address/state
    - otherwise hard fallback to `["Washington, DC"]`
- Keep only canonical outputs: `Washington, DC` or `Outer Banks, NC`.

2) Fix Edit Company initialization so blanks never appear
- File: `src/components/companies/EditCompanyDialog.tsx`
- Replace current conditional init:
  - from “only set selected areas if array length > 0”
  - to “always set selected areas via new fallback helper”
- Result:
  - opening any company always pre-checks one of the two options
  - Dulles and Kat & Mat will no longer open blank.

3) Prevent future blank saves
- File: `src/components/companies/EditCompanyDialog.tsx`
- On submit, if selected areas are empty, auto-apply fallback from address (or default DC).
- This guarantees persisted data is never empty again from this dialog.

4) Apply same safeguard to Add Company
- File: `src/components/companies/AddCompanyDialog.tsx`
- Before insert, if no explicit service area selected, apply same fallback logic.
- Ensures new companies never enter with empty arrays.

5) One-time database backfill for existing empty companies
- Add migration to populate all currently empty `service_areas` so legacy rows are corrected immediately.
- Logic:
  - if address/state indicates NC/Outer Banks cities → `["Outer Banks, NC"]`
  - otherwise default to `["Washington, DC"]`
- This intentionally follows your business rule of only two places and no blanks.

Proposed SQL (safe one-time backfill for empties):
```sql
UPDATE companies
SET service_areas = CASE
  WHEN COALESCE(state, '') ILIKE 'NC'
    OR COALESCE(address_line_1, '') ILIKE '% NC %'
    OR COALESCE(address, '') ILIKE '% NC %'
    OR COALESCE(address_line_1, '') ILIKE '%Outer Banks%'
    OR COALESCE(address, '') ILIKE '%Outer Banks%'
    OR COALESCE(address_line_1, '') ILIKE '%Nags Head%'
    OR COALESCE(address, '') ILIKE '%Nags Head%'
    OR COALESCE(address_line_1, '') ILIKE '%Kitty Hawk%'
    OR COALESCE(address, '') ILIKE '%Kitty Hawk%'
    OR COALESCE(address_line_1, '') ILIKE '%Kill Devil Hills%'
    OR COALESCE(address, '') ILIKE '%Kill Devil Hills%'
  THEN ARRAY['Outer Banks, NC']::text[]
  ELSE ARRAY['Washington, DC']::text[]
END
WHERE archived_at IS NULL
  AND COALESCE(array_length(service_areas, 1), 0) = 0;
```

6) Verification checklist (must pass before closing)
- Open Kat & Mat Electrical Services in Edit Company:
  - expected: Washington, DC checked (not blank)
- Open Dulles Geotechnical in Edit Company:
  - expected: Washington, DC checked (not blank)
- Open several known NC companies:
  - expected: Outer Banks, NC checked
- Save one edited company and reopen:
  - expected: checkbox remains correctly selected
- Confirm no active companies remain with empty `service_areas`:
```sql
SELECT count(*)
FROM companies
WHERE archived_at IS NULL
  AND COALESCE(array_length(service_areas,1),0)=0;
```
Expected result: `0`.

Risk notes and mitigation:
- Risk: a few non-NC addresses may default to DC even if business intent was OBX.
- Mitigation: fallback is intentionally aligned with your rule (“only DC/OBX; never blank”), and users can still manually switch an individual company when needed.

Why this will solve your exact complaint:
- Today’s blank state is caused by empty DB values plus no fallback on dialog open.
- This plan fixes both layers:
  - data layer (backfill existing empties),
  - UI layer (fallback initialization/saving),
so companies will not open blank anymore.
