
User wants to proceed with: Lovable AI Gateway + Project Profile extraction inserted between Phase 2 (Analyzing) and Phase 3 (Review) + historical-cost budget suggestion in the same pass. No new third-party costs beyond existing Roboflow + Lovable AI usage.

Need a tight, concrete plan.

## Plan: Project Profile + Historical Budget Suggestion on Upload

### What gets added to the upload flow

```text
Phase 1: Upload file
Phase 2: Analyze pages (title block + scale per page)  ← unchanged
Phase 2.5: NEW — Extract Project Profile (one AI call over all rendered pages)
Phase 3: Review screen (sheet table + NEW Project Profile panel + NEW Historical Budget panel)
Phase 4: Save & Extract  ← unchanged
```

The new step is one extra Lovable AI Gateway call (Gemini 2.5 Flash, vision) that looks at the page thumbnails as a set and returns a structured project profile.

### Project Profile fields extracted

- Total square footage (heated + unheated breakdown if visible)
- Number of bedrooms, bathrooms (full/half)
- Number of stories
- Garage: bay count + attached/detached
- Basement: none / unfinished / finished + sf
- Foundation type (slab / crawl / basement)
- Roof type (gable / hip / etc.)
- Exterior wall type (if visible)
- Lot orientation / building footprint dimensions (if site plan present)
- Confidence per field (high / medium / low)

Returned via tool-calling with a strict JSON schema so it's never free-text.

### Historical Budget Match

Pure SQL — no AI, no external service. Logic:

1. Query `projects` for completed projects belonging to the same `home_builder_id` that have non-zero `actual_amount` rows in `project_budgets` (reuses existing historical-projects pattern)
2. Score each historical project against the new profile:
   - bedrooms match: ±1 = high score
   - SF within ±15% = high score
   - garage bay match
   - basement type match
3. Take top 3 closest matches
4. Aggregate their actual costs by `cost_code_id` (avg per cost code across the matched projects)
5. Show as a starter budget table the user can accept / discard / use to seed `project_budgets`

### New DB table

```text
takeoff_project_profiles
  id, takeoff_project_id (FK, unique), owner_id
  total_sf, heated_sf, unheated_sf
  bedrooms, full_baths, half_baths, stories
  garage_bays, garage_type
  basement_type, basement_sf
  foundation_type, roof_type, exterior_type
  footprint_length, footprint_width
  ai_confidence jsonb  -- per-field confidence
  raw_extraction jsonb  -- full AI response for debugging
  created_at, updated_at
```

RLS: same `home_builder_id` pattern as `takeoff_projects`.

### New edge function

`extract-project-profile`
- Input: `takeoff_project_id`, list of sheet image storage paths
- Calls Lovable AI Gateway, Gemini 2.5 Flash, with vision + tool-calling for structured output
- Upserts row in `takeoff_project_profiles`
- Returns the structured profile

### New components

- `ProjectProfilePanel.tsx` — editable card shown in Review step, top of the right column
- `HistoricalBudgetSuggestion.tsx` — collapsible card under it, shows top 3 matched projects + suggested per-cost-code budget with "Apply to project budget" button
- Hook `useProjectProfile(takeoffProjectId)` — fetch + update the profile
- Hook `useHistoricalBudgetMatch(profile)` — pure-SQL scoring + aggregation

### UI changes to existing Review dialog

- Add a left/right split inside the Review step: sheet table on left (current), profile + historical match on right
- "Save & Extract" button stays — but if user has clicked "Apply Historical Budget," we additionally seed `project_budgets` rows with `budget_source = 'historical'`

### Not changing

- Sheet detection, scale detection, Roboflow takeoff extraction — all unchanged
- Storage cleanup behavior on cancel — unchanged
- `takeoff_sheets` / `takeoff_items` schema — unchanged

### Cost summary (confirmed)

| Surface | Per-upload impact |
|---|---|
| Lovable AI Gateway | +1 Gemini 2.5 Flash vision call (the profile extraction) |
| Roboflow | unchanged |
| Lovable Cloud (DB/storage) | +1 row in `takeoff_project_profiles`, no new storage |
| Anything else | none |

### Build order

1. Migration: `takeoff_project_profiles` table + RLS
2. Edge function: `extract-project-profile`
3. Hooks: `useProjectProfile`, `useHistoricalBudgetMatch`
4. Components: `ProjectProfilePanel`, `HistoricalBudgetSuggestion`
5. Wire into `SheetUploadDialog` Review step between Phase 2 and Phase 3
6. "Apply Historical Budget" → seed `project_budgets` with `budget_source='historical'`
