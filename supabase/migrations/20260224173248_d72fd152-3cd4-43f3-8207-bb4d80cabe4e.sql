UPDATE companies
SET service_areas = CASE
  WHEN COALESCE(state, '') ILIKE 'NC'
    OR COALESCE(address_line_1, '') ILIKE '%NC%'
    OR COALESCE(address, '') ILIKE '%NC%'
    OR COALESCE(address_line_1, '') ILIKE '%Outer Banks%'
    OR COALESCE(address, '') ILIKE '%Outer Banks%'
    OR COALESCE(address_line_1, '') ILIKE '%Nags Head%'
    OR COALESCE(address, '') ILIKE '%Nags Head%'
    OR COALESCE(address_line_1, '') ILIKE '%Kitty Hawk%'
    OR COALESCE(address, '') ILIKE '%Kitty Hawk%'
    OR COALESCE(address_line_1, '') ILIKE '%Kill Devil Hills%'
    OR COALESCE(address, '') ILIKE '%Kill Devil Hills%'
    OR COALESCE(address_line_1, '') ILIKE '%Corolla%'
    OR COALESCE(address, '') ILIKE '%Corolla%'
    OR COALESCE(address_line_1, '') ILIKE '%Manteo%'
    OR COALESCE(address, '') ILIKE '%Manteo%'
    OR COALESCE(address_line_1, '') ILIKE '%Hatteras%'
    OR COALESCE(address, '') ILIKE '%Hatteras%'
  THEN ARRAY['Outer Banks, NC']::text[]
  ELSE ARRAY['Washington, DC']::text[]
END
WHERE archived_at IS NULL
  AND (service_areas IS NULL OR COALESCE(array_length(service_areas, 1), 0) = 0);