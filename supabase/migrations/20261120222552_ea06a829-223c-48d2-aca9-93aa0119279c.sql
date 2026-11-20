CREATE OR REPLACE FUNCTION public.add_drawing_version(
  _project_id uuid, _sheet_number text, _title text, _discipline text,
  _file_path text, _image_path text, _set_name text, _page_index integer)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  _clean text := trim(regexp_replace(regexp_replace(regexp_replace(trim(coalesce(_sheet_number,'')),
      '^(sheet|sht|dwg)\.?\s*(no\.?|#)?\s*', '', 'i'),
      '\s*(of|/)\s*\d+\s*$', '', 'i'), '\s+', ' ', 'g'));
  _key text := upper(regexp_replace(_clean, '[\s\.\-_]', '', 'g'));
  _sheet_id uuid;
  _ver integer;
BEGIN
  IF _key = '' THEN RAISE EXCEPTION 'Sheet number is required'; END IF;
  IF NOT public.can_access_project(_project_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  INSERT INTO public.drawing_sheets(project_id, sheet_number, sheet_key, title, discipline)
  VALUES (_project_id, _clean, _key, _title, _discipline)
  ON CONFLICT (project_id, sheet_key) DO UPDATE SET updated_at = now()
  RETURNING id INTO _sheet_id;
  PERFORM 1 FROM public.drawing_sheets WHERE id = _sheet_id FOR UPDATE;
  SELECT coalesce(max(version_number),0)+1 INTO _ver FROM public.drawing_sheet_versions WHERE sheet_id = _sheet_id;
  INSERT INTO public.drawing_sheet_versions(sheet_id, project_id, version_number, file_path, image_path, set_name, page_index, title)
  VALUES (_sheet_id, _project_id, _ver, _file_path, _image_path, _set_name, _page_index, _title);
  UPDATE public.drawing_sheets SET current_version = _ver,
    title = coalesce(nullif(_title,''), title), discipline = coalesce(nullif(_discipline,''), discipline),
    sheet_number = _clean, updated_at = now()
  WHERE id = _sheet_id;
  RETURN _ver;
END $$;