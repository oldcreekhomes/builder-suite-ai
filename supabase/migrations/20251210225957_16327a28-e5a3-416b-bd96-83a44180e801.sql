-- Add lot_id column to deposit_lines table
ALTER TABLE public.deposit_lines 
ADD COLUMN lot_id uuid REFERENCES public.project_lots(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_deposit_lines_lot_id ON public.deposit_lines(lot_id);