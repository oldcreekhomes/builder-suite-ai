

## Plan: Major upgrade to Project Profile extraction

### Two root issues

1. **SF mismatch** — current schema forces drawings into `total_sf / heated_sf / unheated_sf`. Real drawings carry an Area Schedule with named buckets (Main Level, Second Level, Finished Basement, Garage, Covered Porch, Unfinished Basement, Total Finished). We were collapsing/guessing instead of copying.
2. **Not enough detail** — only profile-level fields existed. User wants per-element detail for every cost code flagged `estimate = true`.

### Fix #1 — Area Schedule, captured verbatim

Replace the rigid SF fields with a flexible **`area_schedule`** array on `takeoff_project_profiles`:

```text
area_schedule: [
  { label: "Main Level",          sf: 1154 },
  { label: "Second Level",        sf: 1462 },
  { label: "Finished Basement",   sf: 1063 },
  { label: "Total Finished",      sf: 3679 },
  { label: "Garage",              sf: 330  },
  { label: "Covered Porch",       sf: 96   },
  { label: "Unfinished Basement", sf: 26   }
]
```

Prompt instructs the AI: *if an "Area Schedule" / "Area Calculations" / "Square Footage" table exists on any sheet, copy it row-for-row exactly as labeled. Do not infer or sum.* Keep `total_sf / heated_sf / unheated_sf` as derived convenience fields (sum of finished rows, sum of unfinished rows) for the historical-budget matching, but they're computed, not guessed.

Panel UI: editable row-per-bucket table with Add Row button.

### Fix #2 — Per-cost-code element extraction

New table `takeoff_project_estimate_items` — one row per discovered element, linked to a cost code:

```text
takeoff_project_estimate_items
  id, takeoff_project_id (FK), owner_id
  cost_code_id (FK cost_codes)        -- the matched estimate=true cost code
  cost_code_label                      -- "Windows - Double", "Garage Door - Single", etc.
  item_label                           -- "Front entry door", "Bedroom 2 window", etc.
  size                                 -- "3'-0" x 6'-8"", "16' x 7'", etc. (free text, as drawn)
  quantity                             -- numeric
  unit                                 -- "EA", "LF", "SF"
  spec                                 -- jsonb: { pitch: "8/12", swing: "LH", glazing: "tempered", material: "fiberglass" }
  source_sheet                         -- "A2.1" (sheet # if known)
  confidence                           -- high/medium/low
  notes
```

### Extraction strategy

The edge function `extract-project-profile` is restructured to do **two passes** in one call (still one Lovable AI Gateway request, Gemini 2.5 Flash, vision + tool-calling — no new cost surface):

**Pass A — Project Profile** (existing fields + new `area_schedule` array):
- Bedrooms, baths, stories, garage bays/type, basement type/sf, foundation, roof type, exterior type, footprint
- Area Schedule rows, copied verbatim

**Pass B — Estimate Items**, scoped to the company's `estimate=true` cost codes:
- Server first queries `cost_codes` filtered by `owner_id = takeoff_project.owner_id AND estimate = true AND has_subcategories = false`
- Builds an allowed-cost-code list and injects it into the prompt: *"Only extract items that match one of these cost codes. For each, return the cost_code_id."*
- Tool schema returns `items[]` matching the table above
- Server upserts: deletes prior `takeoff_project_estimate_items` for that takeoff_project, inserts fresh

This keeps the model focused on what the company actually estimates — no wasted tokens on cost codes they don't track.

### Drawing-specific extraction targets (from user's request)

The prompt explicitly directs the model to look for and itemize:

- **Windows** — read window schedule if present; otherwise count from elevations. Return size, type (single/double/triple → maps to 4380.1/.2/.3), location label.
- **Exterior doors** — door schedule. Size (e.g., 3'-0" x 6'-8"), swing, material, location.
- **Interior doors** — door schedule. Same fields.
- **Garage doors** — count, size (single vs double → maps to 4490.1/.2).
- **Roof pitches** — read from roof plan / building section labels (e.g., "8/12", "12/12"). Stored on profile as `roof_pitches: ["8/12 main", "10/12 porch"]`.
- **Siding** — Lap vs Board & Batten, with approx LF or SF if elevations are dimensioned.
- **Concrete elements** — footings, basement slab, garage slab, porch slab, egress windows, drain tile, piers — each as separate items if visible.

### New panel: `EstimateItemsPanel.tsx`

Below the Project Profile panel in the Review step. Grouped by cost code, editable table:

```text
4380.1 Windows - Single
  - Bedroom 2          3'-0" x 5'-0"   1 EA   confidence: high
  - Bedroom 3          3'-0" x 5'-0"   1 EA   confidence: high
4380.2 Windows - Double
  - Living room        6'-0" x 5'-0"   1 EA   confidence: medium
4490.1 Garage Door - Single
  - Front garage       9'-0" x 7'-0"   1 EA   confidence: high
4275.3 Garage Slab
  -                    330 SF          1 SF   confidence: high
```

Add row, delete row, edit any cell. "Apply to Takeoff" button seeds `takeoff_items` with these as starting quantities (so they show up immediately in the takeoff table on Save & Extract).

### DB migration summary

```sql
-- 1. Add area_schedule + roof_pitches to existing profile table
ALTER TABLE takeoff_project_profiles
  ADD COLUMN area_schedule jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN roof_pitches jsonb DEFAULT '[]'::jsonb;

-- 2. New table for itemized extractions
CREATE TABLE takeoff_project_estimate_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  takeoff_project_id uuid NOT NULL REFERENCES takeoff_projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  cost_code_id uuid REFERENCES cost_codes(id),
  cost_code_label text,
  item_label text,
  size text,
  quantity numeric,
  unit text DEFAULT 'EA',
  spec jsonb DEFAULT '{}'::jsonb,
  source_sheet text,
  confidence text,
  notes text,
  created_at timestamptz DEFAULT now()
);
-- + RLS mirroring takeoff_projects, + index on takeoff_project_id
```

### Edge function changes

`extract-project-profile`:
- Server queries `cost_codes` for `estimate=true` for this owner before calling AI
- Updated tool schema with `area_schedule`, `roof_pitches`, and `estimate_items[]`
- Upserts profile + replaces estimate items

### UI changes

- `ProjectProfilePanel.tsx` — replace the rigid SF grid with an editable Area Schedule table; add Roof Pitches list
- New `EstimateItemsPanel.tsx` — grouped editable table; "Apply to Takeoff" button
- Wire into Review step in `UploadSheetDialog` next to existing panels

### Cost impact

**Zero new cost surfaces.** Same single Lovable AI Gateway call per upload — just a richer schema and a richer prompt. Roboflow unchanged.

### Build order

1. Migration: `area_schedule`, `roof_pitches`, `takeoff_project_estimate_items` table + RLS
2. Edge function: query estimate=true cost codes, expand schema, expand prompt, upsert items
3. Hook: `useEstimateItems(takeoffProjectId)`
4. UI: rewrite Area Schedule section in `ProjectProfilePanel`; new `EstimateItemsPanel`
5. Wire into Review step + "Apply to Takeoff" seeding `takeoff_items`

