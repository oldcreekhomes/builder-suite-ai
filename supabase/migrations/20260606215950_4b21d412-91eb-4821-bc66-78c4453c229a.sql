
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS subtype text,
  ADD COLUMN IF NOT EXISTS is_default_bank boolean NOT NULL DEFAULT false;

-- Only one default bank per tenant
CREATE UNIQUE INDEX IF NOT EXISTS accounts_one_default_bank_per_owner
  ON public.accounts(owner_id)
  WHERE is_default_bank;

-- Backfill subtypes from existing heuristics
UPDATE public.accounts
SET subtype = 'bank'
WHERE subtype IS NULL
  AND type = 'asset'
  AND (
    (code ~ '^[0-9]+$' AND code::int BETWEEN 1000 AND 1039)
    OR lower(name) LIKE '%bank%'
    OR lower(name) LIKE '%checking%'
    OR lower(name) LIKE '%savings%'
    OR lower(name) LIKE '%cash%'
    OR lower(name) LIKE '%money market%'
    OR lower(name) LIKE '%clearing%'
  );

UPDATE public.accounts
SET subtype = 'loan'
WHERE subtype IS NULL
  AND (
    (code ~ '^[0-9]+$' AND code::int BETWEEN 1040 AND 1069)
    OR lower(name) LIKE '%loan%'
  );

UPDATE public.accounts
SET subtype = 'credit_card'
WHERE subtype IS NULL
  AND type = 'liability'
  AND (lower(name) LIKE '%credit%' OR lower(name) LIKE '%card%');

UPDATE public.accounts
SET subtype = 'equity'
WHERE subtype IS NULL AND type = 'equity';
