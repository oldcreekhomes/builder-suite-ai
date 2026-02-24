
Goal: make Service Area behavior consistent and strict so only two values exist in practice (“Washington, DC” and “Outer Banks, NC”), and legacy “Northern Virginia” always maps to “Washington, DC”.

What I verified
- The Edit Company dialog is loading `service_areas` now, but it uses raw DB values without normalization.
- The database still contains many legacy values:
  - `companies.service_areas` has 58 entries with “Northern Virginia”.
  - `projects.region` has 28 rows with “Northern Virginia”.
- “Patriot Development Company” and “Dulles Geotechnical…” currently have `service_areas = []`, so no checkbox can be pre-checked for those records until a value is set.
- Bid package filtering currently does exact string matching (`areas.includes(projectRegion)`), which breaks when one side is “Northern Virginia” and the other is “Washington, DC”.

Implementation approach
1) Add one shared Service Area normalization utility
- Create a small helper in `src/lib` (e.g., `serviceArea.ts`) that:
  - Defines canonical options: `["Washington, DC", "Outer Banks, NC"]`
  - Maps aliases: `"Northern Virginia" -> "Washington, DC"` (case-insensitive + trimmed handling)
  - Exposes:
    - `normalizeServiceArea(area: string): string | null`
    - `normalizeServiceAreas(areas: string[] | null | undefined): string[]`
    - `isSameServiceArea(a, b): boolean` (optional convenience)
- This becomes the single source of truth used everywhere.

2) Normalize company data when opening/saving Edit Company
- In `EditCompanyDialog.tsx`:
  - On initialization: normalize incoming `company.service_areas` before setting `selectedServiceAreas`.
  - On submit: normalize + dedupe selected areas before writing to DB.
- This guarantees old labels still display as checked in the UI and are saved back canonically.

3) Normalize company data when creating new companies
- In `AddCompanyDialog.tsx`:
  - Normalize + dedupe `selectedServiceAreas` before insert.
- Prevents any non-canonical values from being newly stored.

4) Make filtering resilient in bid-package company selection
- In `AddCompaniesToBidPackageModal.tsx`:
  - Normalize `projectRegion`.
  - Normalize each company’s `service_areas`.
  - Compare canonicalized values instead of raw strings.
- Result: legacy data and current UI labels match correctly during filtering.

5) Constrain project region to canonical choices
- In `EditProjectDialog.tsx`:
  - Replace free-text `region` input with a controlled select (plus optional “No region”).
  - Normalize legacy value on load so “Northern Virginia” displays as “Washington, DC”.
  - Save only canonical region values.
- This prevents reintroducing mismatched strings going forward.

6) One-time data cleanup in database (data update, not schema change)
- Run a one-time update to convert historical values:
  - `companies.service_areas`: replace “Northern Virginia” with “Washington, DC”
  - `projects.region`: set “Northern Virginia” to “Washington, DC”
- This aligns historical rows with current UI options and fixes existing records globally.

7) Validation and QA checklist
- Edit a company with legacy “Northern Virginia” and confirm “Washington, DC” is checked.
- Edit/save/reopen same company to confirm persistence remains canonical.
- Check a company with empty `service_areas` (like Patriot Development): verify no checkbox selected, then set Washington, DC and confirm it persists.
- Open Add Companies to Bid Package for a project in Washington, DC and confirm previously legacy-tagged companies are included.
- Edit a project and confirm region selection is limited to valid values.
- Test the full flow end-to-end in Settings and Bidding screens to confirm behavior is consistent.

Technical notes
- This is primarily a data-normalization consistency fix, not a rendering bug.
- The most robust fix is both:
  - code-level normalization (defensive + future-proof), and
  - one-time data cleanup (historical correctness).
- No table structure changes are needed.
