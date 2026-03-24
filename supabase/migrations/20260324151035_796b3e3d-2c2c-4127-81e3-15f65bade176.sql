CREATE OR REPLACE FUNCTION public.normalize_phone_on_save()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.phone_number IS NOT NULL AND NEW.phone_number != '' THEN
    NEW.phone_number := public.normalize_phone_number(NEW.phone_number);
  END IF;
  RETURN NEW;
END;
$function$;