CREATE OR REPLACE FUNCTION public.require_lot_on_job_cost_bill_line()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.line_type = 'job_cost' AND NEW.lot_id IS NULL AND NEW.project_id IS NOT NULL
     AND (SELECT count(*) FROM public.project_lots WHERE project_id = NEW.project_id) > 1 THEN
    RAISE EXCEPTION 'Pick a lot for every job cost line on this bill.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_require_lot_on_job_cost_bill_line ON public.bill_lines;
CREATE TRIGGER trg_require_lot_on_job_cost_bill_line
BEFORE INSERT OR UPDATE OF lot_id, line_type, project_id ON public.bill_lines
FOR EACH ROW EXECUTE FUNCTION public.require_lot_on_job_cost_bill_line();