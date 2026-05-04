ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS engagement_type text NOT NULL DEFAULT 'trade_partner';

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_engagement_type_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_engagement_type_check
  CHECK (engagement_type IN ('trade_partner','supplier'));