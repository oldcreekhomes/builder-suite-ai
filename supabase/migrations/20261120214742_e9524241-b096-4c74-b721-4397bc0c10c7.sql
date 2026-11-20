REVOKE EXECUTE ON FUNCTION public.can_access_project(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_access_project(uuid) TO authenticated;
CREATE INDEX IF NOT EXISTS idx_drawing_sheet_versions_project ON public.drawing_sheet_versions(project_id);