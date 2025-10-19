-- Drop only the broken company-based RLS policies (keep the working owner_id ones)
DROP POLICY IF EXISTS "Annotations visible to company users" ON takeoff_annotations;
DROP POLICY IF EXISTS "Annotations insertable by company users" ON takeoff_annotations;
DROP POLICY IF EXISTS "Annotations updatable by company users" ON takeoff_annotations;
DROP POLICY IF EXISTS "Annotations deletable by company users" ON takeoff_annotations;