CREATE TABLE public.drawing_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sheet_number text NOT NULL,
  sheet_key text NOT NULL,
  title text,
  discipline text,
  current_version integer NOT NULL DEFAULT 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, sheet_key)
);
CREATE TABLE public.drawing_sheet_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id uuid NOT NULL REFERENCES public.drawing_sheets(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  file_path text NOT NULL,
  image_path text,
  set_name text,
  page_index integer,
  title text,
  uploaded_by uuid DEFAULT auth.uid(),
  created_by uuid,
  updated_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sheet_id, version_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drawing_sheets TO authenticated;
GRANT ALL ON public.drawing_sheets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drawing_sheet_versions TO authenticated;
GRANT ALL ON public.drawing_sheet_versions TO service_role;
ALTER TABLE public.drawing_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_sheet_versions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_project(_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id
      AND (p.owner_id = auth.uid() OR p.owner_id = (
        SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND confirmed = true))
  )
$$;

CREATE POLICY "Company can manage drawing sheets" ON public.drawing_sheets FOR ALL TO authenticated
  USING (public.can_access_project(project_id)) WITH CHECK (public.can_access_project(project_id));
CREATE POLICY "Company can manage drawing versions" ON public.drawing_sheet_versions FOR ALL TO authenticated
  USING (public.can_access_project(project_id)) WITH CHECK (public.can_access_project(project_id));

CREATE TRIGGER set_audit_user_drawing_sheets BEFORE INSERT OR UPDATE ON public.drawing_sheets
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_user();
CREATE TRIGGER set_audit_user_drawing_sheet_versions BEFORE INSERT OR UPDATE ON public.drawing_sheet_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_user();

CREATE OR REPLACE FUNCTION public.add_drawing_version(
  _project_id uuid, _sheet_number text, _title text, _discipline text,
  _file_path text, _image_path text, _set_name text, _page_index integer)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  _key text := upper(regexp_replace(coalesce(_sheet_number,''), '[\s\.\-_]', '', 'g'));
  _sheet_id uuid;
  _ver integer;
BEGIN
  IF _key = '' THEN RAISE EXCEPTION 'Sheet number is required'; END IF;
  IF NOT public.can_access_project(_project_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  INSERT INTO public.drawing_sheets(project_id, sheet_number, sheet_key, title, discipline)
  VALUES (_project_id, trim(_sheet_number), _key, _title, _discipline)
  ON CONFLICT (project_id, sheet_key) DO UPDATE SET updated_at = now()
  RETURNING id INTO _sheet_id;
  SELECT id INTO _sheet_id FROM public.drawing_sheets WHERE id = _sheet_id FOR UPDATE;
  SELECT coalesce(max(version_number),0)+1 INTO _ver FROM public.drawing_sheet_versions WHERE sheet_id = _sheet_id;
  INSERT INTO public.drawing_sheet_versions(sheet_id, project_id, version_number, file_path, image_path, set_name, page_index, title)
  VALUES (_sheet_id, _project_id, _ver, _file_path, _image_path, _set_name, _page_index, _title);
  UPDATE public.drawing_sheets SET current_version = _ver,
    title = coalesce(nullif(_title,''), title), discipline = coalesce(nullif(_discipline,''), discipline),
    sheet_number = trim(_sheet_number), updated_at = now()
  WHERE id = _sheet_id;
  RETURN _ver;
END $$;
GRANT EXECUTE ON FUNCTION public.add_drawing_version(uuid,text,text,text,text,text,text,integer) TO authenticated;