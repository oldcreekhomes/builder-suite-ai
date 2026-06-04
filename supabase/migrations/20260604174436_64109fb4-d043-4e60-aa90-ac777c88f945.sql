-- 1) Rename existing duplicates so the unique index can be created
WITH ranked AS (
  SELECT
    id,
    reference_number,
    ROW_NUMBER() OVER (
      PARTITION BY owner_id, vendor_id, lower(btrim(reference_number))
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.bills
  WHERE reference_number IS NOT NULL
    AND btrim(reference_number) <> ''
    AND status <> 'void'
)
UPDATE public.bills b
SET reference_number = r.reference_number || ' (dup-' || r.rn || ')'
FROM ranked r
WHERE b.id = r.id
  AND r.rn > 1;

-- 2) Partial unique index — per tenant + per vendor, case/whitespace-insensitive
CREATE UNIQUE INDEX IF NOT EXISTS bills_unique_vendor_reference
  ON public.bills (owner_id, vendor_id, lower(btrim(reference_number)))
  WHERE reference_number IS NOT NULL
    AND btrim(reference_number) <> ''
    AND status <> 'void';