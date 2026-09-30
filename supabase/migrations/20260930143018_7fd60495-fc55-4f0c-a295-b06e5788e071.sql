
REVOKE ALL ON FUNCTION public.get_bank_account_balances() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_approved_bills_due(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_bank_account_balances() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_approved_bills_due(integer) TO authenticated;
