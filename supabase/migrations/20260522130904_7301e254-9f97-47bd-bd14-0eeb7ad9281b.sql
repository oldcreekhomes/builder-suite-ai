-- 1. Function: recompute a bill's total from its lines
CREATE OR REPLACE FUNCTION public.recompute_bill_total(_bill_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bills b
  SET total_amount = COALESCE((
    SELECT ROUND(SUM(amount)::numeric, 2)
    FROM public.bill_lines
    WHERE bill_id = _bill_id
  ), 0)
  WHERE b.id = _bill_id
    AND ROUND(b.total_amount::numeric, 2) IS DISTINCT FROM COALESCE((
      SELECT ROUND(SUM(amount)::numeric, 2)
      FROM public.bill_lines
      WHERE bill_id = _bill_id
    ), 0);
END;
$$;

-- 2. Trigger function on bill_lines
CREATE OR REPLACE FUNCTION public.sync_bill_total_from_lines()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_bill_total(OLD.bill_id);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM public.recompute_bill_total(NEW.bill_id);
    IF NEW.bill_id IS DISTINCT FROM OLD.bill_id THEN
      PERFORM public.recompute_bill_total(OLD.bill_id);
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public.recompute_bill_total(NEW.bill_id);
    RETURN NEW;
  END IF;
END;
$$;

-- 3. Trigger
DROP TRIGGER IF EXISTS trg_sync_bill_total_from_lines ON public.bill_lines;
CREATE TRIGGER trg_sync_bill_total_from_lines
AFTER INSERT OR UPDATE OR DELETE ON public.bill_lines
FOR EACH ROW
EXECUTE FUNCTION public.sync_bill_total_from_lines();

-- 4. One-time backfill: fix every drifted bill
UPDATE public.bills b
SET total_amount = sub.s
FROM (
  SELECT bill_id, ROUND(SUM(amount)::numeric, 2) AS s
  FROM public.bill_lines
  GROUP BY bill_id
) sub
WHERE sub.bill_id = b.id
  AND ROUND(b.total_amount::numeric, 2) IS DISTINCT FROM sub.s;