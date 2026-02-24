

## Bulk-Tag All Untagged Companies with Service Areas

### Summary

I've analyzed all your untagged companies and determined the correct region for each. This migration will tag **all remaining companies** in one shot.

### What Gets Tagged

**Washington, DC (165+ companies)** -- All companies with VA, MD, or DC in their address, plus:
- City of Alexandria
- Fabuwood (NJ cabinet supplier)
- Patriot Development Company (Dulles, VA)
- Good Life House Plans (NE)
- Leedo Cabinets (TX)

**Outer Banks, NC (17+ companies)** -- All companies with NC addresses, plus:
- Dare County (GA PO box, but OBX jurisdiction)
- Oceanwatch HOA (GA PO box, OBX name)
- Village at Nags Head POA (NV PO box, OBX name)
- Charter Communications / Spectrum

**Both regions:**
- AnywhereCam LLC

**Rename existing tags:**
- All companies currently tagged "Northern Virginia" will be renamed to "Washington, DC"

**Skipped (left untagged):**
- Jole Ann Cortes (UT)
- Paddle.com (NY)
- Roof Tile Management (Canada)
- TeamViewer (Germany)
- New Kent County, VA (TN address)

### Technical Details

A single SQL migration will run these updates:

```sql
-- 1. Rename "Northern Virginia" -> "Washington, DC" on already-tagged companies
UPDATE companies 
SET service_areas = array_replace(service_areas, 'Northern Virginia', 'Washington, DC')
WHERE 'Northern Virginia' = ANY(service_areas);

-- 2. Tag all VA/MD/DC-addressed companies as "Washington, DC"
UPDATE companies 
SET service_areas = ARRAY['Washington, DC']
WHERE archived_at IS NULL 
  AND (service_areas IS NULL OR service_areas = '{}')
  AND (address ILIKE '%VA %' OR address ILIKE '%Virginia%' 
       OR address ILIKE '%MD %' OR address ILIKE '%Maryland%' 
       OR address ILIKE '%DC %' OR address ILIKE '%, DC%'
       OR state IN ('VA','MD','DC'));

-- 3. Tag all NC-addressed companies as "Outer Banks, NC"
UPDATE companies 
SET service_areas = ARRAY['Outer Banks, NC']
WHERE archived_at IS NULL 
  AND (service_areas IS NULL OR service_areas = '{}')
  AND (address ILIKE '%NC %' OR address ILIKE '%North Carolina%' OR state = 'NC');

-- 4. Specific companies you identified:
-- City of Alexandria -> DC
UPDATE companies SET service_areas = ARRAY['Washington, DC'] 
WHERE company_name = 'City of Alexandria' AND (service_areas IS NULL OR service_areas = '{}');

-- Fabuwood -> DC
UPDATE companies SET service_areas = ARRAY['Washington, DC'] 
WHERE company_name = 'Fabuwood' AND (service_areas IS NULL OR service_areas = '{}');

-- Patriot Development -> DC
UPDATE companies SET service_areas = ARRAY['Washington, DC'] 
WHERE company_name ILIKE 'Patriot Development%' AND (service_areas IS NULL OR service_areas = '{}');

-- Good Life House Plans -> DC
UPDATE companies SET service_areas = ARRAY['Washington, DC'] 
WHERE company_name ILIKE 'Good Life%' AND (service_areas IS NULL OR service_areas = '{}');

-- Leedo Cabinets -> DC
UPDATE companies SET service_areas = ARRAY['Washington, DC'] 
WHERE company_name ILIKE 'Leedo%' AND (service_areas IS NULL OR service_areas = '{}');

-- Dare County -> OBX
UPDATE companies SET service_areas = ARRAY['Outer Banks, NC'] 
WHERE company_name ILIKE 'Dare County%' AND (service_areas IS NULL OR service_areas = '{}');

-- Oceanwatch HOA -> OBX
UPDATE companies SET service_areas = ARRAY['Outer Banks, NC'] 
WHERE company_name ILIKE 'Oceanwatch%' AND (service_areas IS NULL OR service_areas = '{}');

-- Village at Nags Head POA -> OBX
UPDATE companies SET service_areas = ARRAY['Outer Banks, NC'] 
WHERE company_name ILIKE 'Village at Nags Head%' AND (service_areas IS NULL OR service_areas = '{}');

-- Charter/Spectrum -> OBX
UPDATE companies SET service_areas = ARRAY['Outer Banks, NC'] 
WHERE company_name ILIKE 'Charter%' AND (service_areas IS NULL OR service_areas = '{}');

-- AnywhereCam -> Both
UPDATE companies SET service_areas = ARRAY['Washington, DC', 'Outer Banks, NC'] 
WHERE company_name ILIKE 'AnywhereCam%' AND (service_areas IS NULL OR service_areas = '{}');

-- 5. Also rename region on projects table
UPDATE projects SET region = 'Washington, DC' WHERE region = 'Northern Virginia';
```

This will also rename any projects tagged "Northern Virginia" to "Washington, DC" to match the new naming.

