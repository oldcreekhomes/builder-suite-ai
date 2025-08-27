
-- 1) Add a link from POs to bid packages
ALTER TABLE public.project_purchase_orders
ADD COLUMN IF NOT EXISTS bid_package_id uuid;

-- 2) Backfill existing POs that were created from the bidding flow
-- We match on project_id + cost_code_id and only touch POs created via the bidding UI (based on the standardized note)
UPDATE public.project_purchase_orders po
SET bid_package_id = pb.id
FROM public.project_bid_packages pb
WHERE po.bid_package_id IS NULL
  AND po.project_id = pb.project_id
  AND po.cost_code_id = pb.cost_code_id
  AND po.notes ILIKE 'PO created from bid package%';

-- 3) Add FK with ON DELETE CASCADE so deleting a bid package deletes linked POs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_purchase_orders_bid_package_id_fkey'
  ) THEN
    ALTER TABLE public.project_purchase_orders
      ADD CONSTRAINT project_purchase_orders_bid_package_id_fkey
      FOREIGN KEY (bid_package_id)
      REFERENCES public.project_bid_packages(id)
      ON DELETE CASCADE;
  END IF;
END$$;

-- 4) Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_project_purchase_orders_bid_package_id
  ON public.project_purchase_orders(bid_package_id);

-- 5) Auto-populate bid_package_id for future inserts/updates
CREATE OR REPLACE FUNCTION public.set_po_bid_package_id()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.bid_package_id IS NULL THEN
    SELECT id INTO NEW.bid_package_id
    FROM public.project_bid_packages
    WHERE project_id = NEW.project_id
      AND cost_code_id = NEW.cost_code_id
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_po_bid_package_id'
  ) THEN
    CREATE TRIGGER trg_set_po_bid_package_id
    BEFORE INSERT OR UPDATE ON public.project_purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_po_bid_package_id();
  END IF;
END$$;

-- 6) One-time cleanup of orphan POs created from the bidding flow
-- This removes POs clearly originating from the bidding flow (note prefix)
-- that no longer have any matching bid package record.
DELETE FROM public.project_purchase_orders po
WHERE po.notes ILIKE 'PO created from bid package%'
  AND NOT EXISTS (
    SELECT 1
    FROM public.project_bid_packages pb
    WHERE pb.project_id = po.project_id
      AND pb.cost_code_id = po.cost_code_id
  );
