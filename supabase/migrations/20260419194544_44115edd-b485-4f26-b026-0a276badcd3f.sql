CREATE OR REPLACE FUNCTION public.get_my_company_features()
RETURNS TABLE(
  apartments boolean,
  estimating boolean,
  marketplace boolean,
  templates boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  co_name text;
BEGIN
  -- Resolve the caller's company name (owner: own; employee/accountant: owner's via home_builder_id)
  SELECT CASE
    WHEN u.role = 'owner' THEN u.company_name
    ELSE (SELECT owner.company_name FROM public.users owner WHERE owner.id = u.home_builder_id)
  END
  INTO co_name
  FROM public.users u
  WHERE u.id = auth.uid()
  LIMIT 1;

  RETURN QUERY
  SELECT
    COALESCE((SELECT cfa.enabled FROM public.company_feature_access cfa
              WHERE cfa.company_name = co_name AND cfa.feature = 'apartments'), true)  AS apartments,
    COALESCE((SELECT cfa.enabled FROM public.company_feature_access cfa
              WHERE cfa.company_name = co_name AND cfa.feature = 'estimating'), true)  AS estimating,
    COALESCE((SELECT cfa.enabled FROM public.company_feature_access cfa
              WHERE cfa.company_name = co_name AND cfa.feature = 'marketplace'), true) AS marketplace,
    COALESCE((SELECT cfa.enabled FROM public.company_feature_access cfa
              WHERE cfa.company_name = co_name AND cfa.feature = 'templates'), true)   AS templates;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_company_features() TO authenticated;