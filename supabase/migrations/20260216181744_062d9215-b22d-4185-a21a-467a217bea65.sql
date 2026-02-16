
-- Create purchase_order_lines table
CREATE TABLE public.purchase_order_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.project_purchase_orders(id) ON DELETE CASCADE,
  cost_code_id UUID REFERENCES public.cost_codes(id),
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  line_number INTEGER NOT NULL DEFAULT 1,
  extra BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Make cost_code_id nullable on the PO header
ALTER TABLE public.project_purchase_orders ALTER COLUMN cost_code_id DROP NOT NULL;

-- Enable RLS
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies matching PO policies (access through parent PO -> project)
CREATE POLICY "PO lines visible to company users" ON public.purchase_order_lines
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM project_purchase_orders po
    JOIN projects p ON p.id = po.project_id
    WHERE po.id = purchase_order_lines.purchase_order_id
      AND (p.owner_id = auth.uid() OR p.owner_id IN (
        SELECT u.home_builder_id FROM users u WHERE u.id = auth.uid() AND u.confirmed = true
      ))
  )
);

CREATE POLICY "PO lines insert for company users" ON public.purchase_order_lines
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_purchase_orders po
    JOIN projects p ON p.id = po.project_id
    WHERE po.id = purchase_order_lines.purchase_order_id
      AND (p.owner_id = auth.uid() OR p.owner_id IN (
        SELECT u.home_builder_id FROM users u WHERE u.id = auth.uid() AND u.confirmed = true
      ))
  )
);

CREATE POLICY "PO lines update for company users" ON public.purchase_order_lines
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM project_purchase_orders po
    JOIN projects p ON p.id = po.project_id
    WHERE po.id = purchase_order_lines.purchase_order_id
      AND (p.owner_id = auth.uid() OR p.owner_id IN (
        SELECT u.home_builder_id FROM users u WHERE u.id = auth.uid() AND u.confirmed = true
      ))
  )
);

CREATE POLICY "PO lines delete for company users" ON public.purchase_order_lines
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM project_purchase_orders po
    JOIN projects p ON p.id = po.project_id
    WHERE po.id = purchase_order_lines.purchase_order_id
      AND (p.owner_id = auth.uid() OR p.owner_id IN (
        SELECT u.home_builder_id FROM users u WHERE u.id = auth.uid() AND u.confirmed = true
      ))
  )
);

-- Updated_at trigger
CREATE TRIGGER update_purchase_order_lines_updated_at
BEFORE UPDATE ON public.purchase_order_lines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing POs into purchase_order_lines
INSERT INTO public.purchase_order_lines (purchase_order_id, cost_code_id, quantity, unit_cost, amount, line_number, extra)
SELECT id, cost_code_id, 1, COALESCE(total_amount, 0), COALESCE(total_amount, 0), 1, extra
FROM public.project_purchase_orders
WHERE cost_code_id IS NOT NULL;
