UPDATE public.user_notification_preferences SET can_connect_bank_accounts = false WHERE can_connect_bank_accounts = true;
ALTER TABLE public.user_notification_preferences ALTER COLUMN can_connect_bank_accounts SET DEFAULT false;
CREATE OR REPLACE FUNCTION public.guard_cash_negative_filter_pref()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.can_connect_bank_accounts := false;
  ELSIF NEW.can_connect_bank_accounts IS DISTINCT FROM OLD.can_connect_bank_accounts
     AND (auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'owner')) THEN
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Only the owner can change Connect Bank Accounts access';
    END IF;
  END IF;
  RETURN NEW;
END $function$;