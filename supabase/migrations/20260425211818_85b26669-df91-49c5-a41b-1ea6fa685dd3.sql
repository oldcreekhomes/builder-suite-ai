UPDATE public.project_purchase_orders
SET sent_at = created_at
WHERE sent_at IS NULL;