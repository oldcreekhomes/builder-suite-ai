-- Add invoice date columns for QuickBooks view in accountant dashboard
ALTER TABLE public.projects
ADD COLUMN qb_invoices_approved_date date,
ADD COLUMN qb_invoices_paid_date date;