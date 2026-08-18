ALTER TABLE public.project_purchase_orders
  ADD COLUMN IF NOT EXISTS first_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS send_count integer NOT NULL DEFAULT 0;

UPDATE public.project_purchase_orders
SET first_sent_at = COALESCE(first_sent_at, sent_at),
    send_count = GREATEST(send_count, 1)
WHERE sent_at IS NOT NULL;