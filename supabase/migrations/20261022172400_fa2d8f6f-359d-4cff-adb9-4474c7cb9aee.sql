ALTER TABLE public.user_notification_preferences ADD COLUMN IF NOT EXISTS can_view_cash_negative_filter boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.guard_cash_negative_filter_pref()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.can_view_cash_negative_filter AND NOT public.has_role(auth.uid(), 'owner') THEN
      NEW.can_view_cash_negative_filter := false;
    END IF;
  ELSIF NEW.can_view_cash_negative_filter IS DISTINCT FROM OLD.can_view_cash_negative_filter
     AND NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'Only the owner can change the Cash Position Negative filter access';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_cash_negative_filter_pref ON public.user_notification_preferences;
CREATE TRIGGER guard_cash_negative_filter_pref BEFORE INSERT OR UPDATE ON public.user_notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.guard_cash_negative_filter_pref();