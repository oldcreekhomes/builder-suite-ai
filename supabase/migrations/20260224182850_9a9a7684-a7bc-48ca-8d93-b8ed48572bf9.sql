
ALTER TABLE company_representatives
  ADD COLUMN service_areas text[] NOT NULL DEFAULT '{}'::text[];

UPDATE company_representatives cr
SET service_areas = COALESCE(c.service_areas, ARRAY['Washington, DC']::text[])
FROM companies c
WHERE cr.company_id = c.id;
