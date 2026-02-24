-- One-time data cleanup: normalize legacy "Northern Virginia" to "Washington, DC"
UPDATE companies
SET service_areas = array_replace(service_areas, 'Northern Virginia', 'Washington, DC')
WHERE 'Northern Virginia' = ANY(service_areas);

UPDATE projects
SET region = 'Washington, DC'
WHERE region = 'Northern Virginia';