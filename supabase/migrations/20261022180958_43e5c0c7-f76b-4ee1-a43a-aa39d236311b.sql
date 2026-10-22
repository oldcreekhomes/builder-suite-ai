ALTER TABLE public.user_notification_preferences RENAME COLUMN can_view_cash_negative_filter TO can_connect_bank_accounts;
UPDATE public.user_notification_preferences p SET can_connect_bank_accounts = true
  WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role = 'owner');
CREATE OR REPLACE FUNCTION public.guard_cash_negative_filter_pref()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NOT public.has_role(auth.uid(), 'owner') THEN
      NEW.can_connect_bank_accounts := public.has_role(NEW.user_id, 'owner');
    END IF;
  ELSIF NEW.can_connect_bank_accounts IS DISTINCT FROM OLD.can_connect_bank_accounts
     AND NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'Only the owner can change Connect Bank Accounts access';
  END IF;
  RETURN NEW;
END $function$;