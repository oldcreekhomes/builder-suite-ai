-- Create project_lots table
CREATE TABLE IF NOT EXISTS public.project_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  lot_number INTEGER NOT NULL,
  lot_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_project_lot_number UNIQUE(project_id, lot_number)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_project_lots_project_id ON public.project_lots(project_id);

-- Add lot_id columns to relevant tables
ALTER TABLE public.project_budgets ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES public.project_lots(id) ON DELETE SET NULL;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES public.project_lots(id) ON DELETE SET NULL;
ALTER TABLE public.bill_lines ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES public.project_lots(id) ON DELETE SET NULL;
ALTER TABLE public.project_purchase_orders ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES public.project_lots(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_budgets_lot_id ON public.project_budgets(lot_id);
CREATE INDEX IF NOT EXISTS idx_bills_lot_id ON public.bills(lot_id);
CREATE INDEX IF NOT EXISTS idx_bill_lines_lot_id ON public.bill_lines(lot_id);
CREATE INDEX IF NOT EXISTS idx_project_purchase_orders_lot_id ON public.project_purchase_orders(lot_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_project_lots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_lots_updated_at
  BEFORE UPDATE ON public.project_lots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_lots_updated_at();

-- RLS Policies for project_lots
ALTER TABLE public.project_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lots visible to project owner and employees" ON public.project_lots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_lots.project_id
      AND (
        p.owner_id = auth.uid()
        OR p.owner_id IN (
          SELECT u.home_builder_id FROM public.users u
          WHERE u.id = auth.uid() AND u.confirmed = true AND u.role IN ('employee', 'accountant')
        )
      )
    )
  );

CREATE POLICY "Lots manageable by project owner and employees" ON public.project_lots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_lots.project_id
      AND (
        p.owner_id = auth.uid()
        OR p.owner_id IN (
          SELECT u.home_builder_id FROM public.users u
          WHERE u.id = auth.uid() AND u.confirmed = true AND u.role IN ('employee', 'accountant')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_lots.project_id
      AND (
        p.owner_id = auth.uid()
        OR p.owner_id IN (
          SELECT u.home_builder_id FROM public.users u
          WHERE u.id = auth.uid() AND u.confirmed = true AND u.role IN ('employee', 'accountant')
        )
      )
    )
  );

-- Function to initialize lots for a project based on total_lots
CREATE OR REPLACE FUNCTION public.initialize_project_lots(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_lots INTEGER;
  v_lot_num INTEGER;
BEGIN
  -- Get total_lots for the project
  SELECT total_lots INTO v_total_lots
  FROM public.projects
  WHERE id = p_project_id;
  
  -- Only proceed if total_lots is set
  IF v_total_lots IS NOT NULL AND v_total_lots > 0 THEN
    -- Create lot records
    FOR v_lot_num IN 1..v_total_lots LOOP
      INSERT INTO public.project_lots (project_id, lot_number, lot_name)
      VALUES (p_project_id, v_lot_num, 'Lot ' || v_lot_num)
      ON CONFLICT (project_id, lot_number) DO NOTHING;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;