CREATE OR REPLACE FUNCTION public.clear_notification_recipients_on_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.access_revoked IS TRUE AND COALESCE(OLD.access_revoked, false) IS DISTINCT FROM TRUE)
     OR (NEW.pending_removal_at IS NOT NULL AND OLD.pending_removal_at IS NULL) THEN
    DELETE FROM public.project_notification_recipients WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_notification_recipients_on_removal ON public.users;
CREATE TRIGGER clear_notification_recipients_on_removal
AFTER UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.clear_notification_recipients_on_removal();

DELETE FROM public.project_notification_recipients pnr
USING public.users u
WHERE pnr.user_id = u.id
  AND (u.access_revoked IS TRUE OR u.pending_removal_at IS NOT NULL);