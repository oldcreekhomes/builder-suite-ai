
-- 1) Add bid_id column to project_purchase_orders
ALTER TABLE public.project_purchase_orders
  ADD COLUMN IF NOT EXISTS bid_id uuid;

-- 2) Backfill bid_id by matching bid_package_id + company_id to the latest project_bids row
WITH latest_bid AS (
  SELECT
    b.id,
    b.bid_package_id,
    b.company_id,
    ROW_NUMBER() OVER (
      PARTITION BY b.bid_package_id, b.company_id
      ORDER BY b.created_at DESC, b.id DESC
    ) AS rn
  FROM public.project_bids b
)
UPDATE public.project_purchase_orders p
SET bid_id = lb.id
FROM latest_bid lb
WHERE p.bid_id IS NULL
  AND p.bid_package_id IS NOT NULL
  AND p.company_id = lb.company_id
  AND p.bid_package_id = lb.bid_package_id
  AND lb.rn = 1;

-- 3) One-time cleanup: delete orphan POs that were created from bidding
-- Case A: POs flagged as "created from bid package" whose bid_package_id no longer exists
DELETE FROM public.project_purchase_orders p
WHERE p.notes ILIKE 'PO created from bid package%'
  AND p.bid_id IS NULL
  AND p.bid_package_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.project_bid_packages bp
    WHERE bp.id = p.bid_package_id
  );

-- Case B: POs flagged as "created from bid package" whose bid_id no longer exists
DELETE FROM public.project_purchase_orders p
WHERE p.notes ILIKE 'PO created from bid package%'
  AND p.bid_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.project_bids b
    WHERE b.id = p.bid_id
  );

-- Safety: clear invalid bid_package_id on any remaining POs to avoid FK failures
UPDATE public.project_purchase_orders p
SET bid_package_id = NULL
WHERE p.bid_package_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.project_bid_packages bp WHERE bp.id = p.bid_package_id
  );

-- 4) Add FKs with ON DELETE CASCADE
ALTER TABLE public.project_purchase_orders
  ADD CONSTRAINT project_purchase_orders_bid_id_fkey
  FOREIGN KEY (bid_id)
  REFERENCES public.project_bids (id)
  ON DELETE CASCADE;

ALTER TABLE public.project_purchase_orders
  ADD CONSTRAINT project_purchase_orders_bid_package_id_fkey
  FOREIGN KEY (bid_package_id)
  REFERENCES public.project_bid_packages (id)
  ON DELETE CASCADE;

-- 5) Indexes to keep lookups and cascades fast
CREATE INDEX IF NOT EXISTS idx_project_purchase_orders_bid_id
  ON public.project_purchase_orders (bid_id);

CREATE INDEX IF NOT EXISTS idx_project_purchase_orders_bid_package_id
  ON public.project_purchase_orders (bid_package_id);

-- 6) Trigger to set bid_id automatically on insert when bid_package_id + company_id are present
CREATE OR REPLACE FUNCTION public.set_po_bid_id()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.bid_id IS NULL AND NEW.bid_package_id IS NOT NULL AND NEW.company_id IS NOT NULL THEN
    SELECT b.id
    INTO NEW.bid_id
    FROM public.project_bids b
    WHERE b.bid_package_id = NEW.bid_package_id
      AND b.company_id = NEW.company_id
    ORDER BY b.created_at DESC, b.id DESC
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$function$;

-- 7) Attach triggers for auto-population and updated_at
-- Note: set_po_bid_package_id() already exists; attach it to inserts
DROP TRIGGER IF EXISTS set_po_bid_package_id_trg ON public.project_purchase_orders;
CREATE TRIGGER set_po_bid_package_id_trg
BEFORE INSERT ON public.project_purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_po_bid_package_id();

DROP TRIGGER IF EXISTS set_po_bid_id_trg ON public.project_purchase_orders;
CREATE TRIGGER set_po_bid_id_trg
BEFORE INSERT ON public.project_purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_po_bid_id();

DROP TRIGGER IF EXISTS set_project_purchase_orders_updated_at_trg ON public.project_purchase_orders;
CREATE TRIGGER set_project_purchase_orders_updated_at_trg
BEFORE UPDATE ON public.project_purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_project_purchase_orders_updated_at();
