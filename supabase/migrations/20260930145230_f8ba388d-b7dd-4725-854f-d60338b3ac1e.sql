REVOKE EXECUTE ON FUNCTION public.get_project_cash_position(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_cash_position(integer) TO authenticated;