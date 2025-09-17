-- Normalize existing project_purchase_orders.files entries to uniform redirectable objects
-- Function to normalize a single element
CREATE OR REPLACE FUNCTION public.normalize_po_file_elem(elem jsonb, project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  typ text;
  raw text;
  bucket text;
  path text;
  name text;
BEGIN
  typ := jsonb_typeof(elem);

  IF typ = 'object' THEN
    -- If already has bucket/path, standardize name
    IF (elem ? 'bucket') AND (elem ? 'path') THEN
      bucket := elem->>'bucket';
      path := elem->>'path';
      name := COALESCE(elem->>'name', regexp_replace(elem->>'path','^.*/',''));
      RETURN jsonb_build_object('bucket', bucket, 'path', path, 'name', name);
    END IF;

    -- If URL provided, try to parse
    IF (elem ? 'url') THEN
      raw := elem->>'url';
      raw := btrim(raw, ' "');

      -- Redirect URL
      IF position('/file-redirect' in raw) > 0 THEN
        bucket := substring(raw from 'bucket=([^&]+)');
        path := substring(raw from 'path=([^&]+)');
        name := COALESCE(substring(raw from 'fileName=([^&]+)'), elem->>'name');
        IF bucket IS NOT NULL AND path IS NOT NULL THEN
          name := COALESCE(name, regexp_replace(path,'^.*/',''));
          RETURN jsonb_build_object('bucket', bucket, 'path', path, 'name', name);
        END IF;
      END IF;

      -- Direct public URL
      IF position('/storage/v1/object/public/' in raw) > 0 THEN
        bucket := substring(raw from '/storage/v1/object/public/([^/]+)/');
        path := substring(raw from '/storage/v1/object/public/[^/]+/(.+)$');
        name := COALESCE(elem->>'name', regexp_replace(path,'^.*/',''));
        RETURN jsonb_build_object('bucket', bucket, 'path', path, 'name', name);
      END IF;

      -- Proposals path inside URL
      IF position('/proposals/' in raw) > 0 THEN
        path := 'proposals/' || substring(raw from '/proposals/([^?#]+)');
        name := COALESCE(elem->>'name', regexp_replace(path,'^.*/',''));
        RETURN jsonb_build_object('bucket', 'project-files', 'path', path, 'name', name);
      END IF;
    END IF;

    -- Fallback from object with id/name
    raw := COALESCE(elem->>'id', elem->>'name', '');
    IF raw <> '' THEN
      path := 'purchase-orders/' || project_id::text || '/' || raw;
      name := COALESCE(elem->>'name', raw);
      RETURN jsonb_build_object('bucket','project-files','path',path,'name',name);
    END IF;

    RETURN elem; -- as-is

  ELSIF typ = 'string' THEN
    raw := elem::text;
    raw := trim(both '"' from raw);
    raw := btrim(raw, ' ');

    -- Redirect link
    IF position('/file-redirect' in raw) > 0 THEN
      bucket := substring(raw from 'bucket=([^&]+)');
      path := substring(raw from 'path=([^&]+)');
      name := substring(raw from 'fileName=([^&]+)');
      IF bucket IS NOT NULL AND path IS NOT NULL THEN
        name := COALESCE(name, regexp_replace(path,'^.*/',''));
        RETURN jsonb_build_object('bucket', bucket, 'path', path, 'name', name);
      END IF;
    END IF;

    -- Direct public URL
    IF position('/storage/v1/object/public/' in raw) > 0 THEN
      bucket := substring(raw from '/storage/v1/object/public/([^/]+)/');
      path := substring(raw from '/storage/v1/object/public/[^/]+/(.+)$');
      name := regexp_replace(path,'^.*/','');
      RETURN jsonb_build_object('bucket', bucket, 'path', path, 'name', name);
    END IF;

    -- Proposals path
    IF position('/proposals/' in raw) > 0 THEN
      path := 'proposals/' || substring(raw from '/proposals/([^?#]+)');
      name := regexp_replace(path,'^.*/','');
      RETURN jsonb_build_object('bucket','project-files','path',path,'name',name);
    END IF;

    -- proposal_ prefix
    IF raw LIKE 'proposal_%' THEN
      path := 'proposals/' || raw;
      name := regexp_replace(path,'^.*/','');
      RETURN jsonb_build_object('bucket','project-files','path',path,'name',name);
    END IF;

    -- Fallback
    path := 'purchase-orders/' || project_id::text || '/' || raw;
    name := regexp_replace(raw,'^.*/','');
    RETURN jsonb_build_object('bucket','project-files','path',path,'name',name);
  ELSE
    RETURN elem;
  END IF;
END;
$$;

-- Update all existing rows to normalized structure
UPDATE public.project_purchase_orders ppo
SET files = COALESCE((
  SELECT jsonb_agg(public.normalize_po_file_elem(e, ppo.project_id))
  FROM jsonb_array_elements(COALESCE(ppo.files, '[]'::jsonb)) AS e
), '[]'::jsonb)
WHERE ppo.files IS NOT NULL;