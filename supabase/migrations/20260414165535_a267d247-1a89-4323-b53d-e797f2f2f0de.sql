
INSERT INTO public.cost_code_price_history (cost_code_id, price, changed_at, owner_id)
VALUES ('46447250-c06c-435f-8ec2-ac1908297de2', 7700, '2025-12-12T00:00:00Z', '2653aba8-d154-4301-99bf-77d559492e19');

UPDATE public.cost_codes
SET price = 7700, updated_at = now()
WHERE id = '46447250-c06c-435f-8ec2-ac1908297de2';
