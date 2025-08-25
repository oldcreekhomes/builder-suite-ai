-- Create project_purchase_orders table
CREATE TABLE public.project_purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  company_id UUID NOT NULL,
  cost_code_id UUID NOT NULL,
  extra BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  files JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE public.project_purchase_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view purchase orders for their projects" 
ON public.project_purchase_orders 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = project_purchase_orders.project_id 
  AND (
    projects.owner_id = auth.uid() 
    OR projects.owner_id IN (
      SELECT home_builder_id FROM users 
      WHERE id = auth.uid() AND confirmed = true AND role = 'employee'
    )
  )
));

CREATE POLICY "Users can create purchase orders for their projects" 
ON public.project_purchase_orders 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = project_purchase_orders.project_id 
  AND (
    projects.owner_id = auth.uid() 
    OR projects.owner_id IN (
      SELECT home_builder_id FROM users 
      WHERE id = auth.uid() AND confirmed = true AND role = 'employee'
    )
  )
));

CREATE POLICY "Users can update purchase orders for their projects" 
ON public.project_purchase_orders 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = project_purchase_orders.project_id 
  AND (
    projects.owner_id = auth.uid() 
    OR projects.owner_id IN (
      SELECT home_builder_id FROM users 
      WHERE id = auth.uid() AND confirmed = true AND role = 'employee'
    )
  )
));

CREATE POLICY "Users can delete purchase orders for their projects" 
ON public.project_purchase_orders 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = project_purchase_orders.project_id 
  AND (
    projects.owner_id = auth.uid() 
    OR projects.owner_id IN (
      SELECT home_builder_id FROM users 
      WHERE id = auth.uid() AND confirmed = true AND role = 'employee'
    )
  )
));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_project_purchase_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_purchase_orders_updated_at
BEFORE UPDATE ON public.project_purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_project_purchase_orders_updated_at();

-- Clean up any existing project_purchase_order_files table if it exists
DROP TABLE IF EXISTS public.project_purchase_order_files;