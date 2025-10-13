-- First, clean up any orphaned purchase orders
DELETE FROM public.project_purchase_orders
WHERE project_id NOT IN (SELECT id FROM public.projects);

-- Create project_po_counters table for atomic sequencing
CREATE TABLE public.project_po_counters (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  current_number integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on project_po_counters
ALTER TABLE public.project_po_counters ENABLE ROW LEVEL SECURITY;

-- Policy: PO counters visible to project members
CREATE POLICY "PO counters visible to project members"
  ON public.project_po_counters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_po_counters.project_id
        AND (
          projects.owner_id = auth.uid() 
          OR projects.owner_id IN (
            SELECT home_builder_id FROM users 
            WHERE id = auth.uid() AND confirmed = true
          )
        )
    )
  );

-- Trigger for updating updated_at on project_po_counters
CREATE TRIGGER update_po_counters_updated_at
  BEFORE UPDATE ON public.project_po_counters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add po_number column to project_purchase_orders
ALTER TABLE public.project_purchase_orders
  ADD COLUMN po_number text UNIQUE;

-- Create unique index on po_number
CREATE UNIQUE INDEX idx_project_purchase_orders_po_number 
  ON public.project_purchase_orders(po_number);

-- Function to extract address code (street number + first letter)
CREATE OR REPLACE FUNCTION public.extract_address_code(address_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  street_number text;
  street_name text;
  first_letter text;
BEGIN
  -- Extract leading numbers (handles ranges like "201-207")
  street_number := SUBSTRING(address_text FROM '^(\d+)');
  
  -- If no number found, return 'ADDR' as fallback
  IF street_number IS NULL OR street_number = '' THEN
    RETURN 'ADDR';
  END IF;
  
  -- Remove the number and any following punctuation/spaces
  street_name := TRIM(REGEXP_REPLACE(address_text, '^(\d+[-\d]*)\s*', '', 'i'));
  
  -- Extract first alphabetic character from street name
  first_letter := SUBSTRING(REGEXP_REPLACE(street_name, '[^A-Za-z]', '', 'g') FROM 1 FOR 1);
  
  -- If we found a letter, append it; otherwise just return the number
  IF first_letter IS NOT NULL AND first_letter != '' THEN
    RETURN street_number || UPPER(first_letter);
  ELSE
    RETURN street_number;
  END IF;
END;
$$;

-- Function to atomically generate PO number
CREATE OR REPLACE FUNCTION public.generate_po_number(p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text;
  v_address_code text;
  v_sequence integer;
  v_po_number text;
  v_project_address text;
BEGIN
  -- Get current year
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  
  -- Get project address
  SELECT address INTO v_project_address
  FROM public.projects
  WHERE id = p_project_id;
  
  -- Extract address code (e.g., "415E", "126L")
  v_address_code := extract_address_code(v_project_address);
  
  -- Atomically increment counter for this project
  INSERT INTO public.project_po_counters (project_id, current_number)
  VALUES (p_project_id, 1)
  ON CONFLICT (project_id) 
  DO UPDATE SET 
    current_number = project_po_counters.current_number + 1,
    updated_at = NOW()
  RETURNING current_number INTO v_sequence;
  
  -- Format: {YEAR}-{ADDRESS_CODE}-{0001}
  v_po_number := v_year || '-' || v_address_code || '-' || LPAD(v_sequence::text, 4, '0');
  
  RETURN v_po_number;
END;
$$;

-- Trigger function to auto-generate PO number
CREATE OR REPLACE FUNCTION public.set_po_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.po_number IS NULL THEN
    NEW.po_number := generate_po_number(NEW.project_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate PO number on insert
CREATE TRIGGER set_po_number_trigger
  BEFORE INSERT ON public.project_purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_po_number();

-- Initialize counters for existing projects with POs
INSERT INTO public.project_po_counters (project_id, current_number)
SELECT 
  project_id,
  COUNT(*) as current_number
FROM public.project_purchase_orders
GROUP BY project_id
ON CONFLICT (project_id) DO NOTHING;

-- Backfill PO numbers for existing records based on creation order
WITH ranked_pos AS (
  SELECT 
    pp.id,
    pp.project_id,
    EXTRACT(YEAR FROM pp.created_at)::text AS year,
    extract_address_code(p.address) AS address_code,
    ROW_NUMBER() OVER (PARTITION BY pp.project_id ORDER BY pp.created_at) AS seq
  FROM public.project_purchase_orders pp
  JOIN public.projects p ON pp.project_id = p.id
  WHERE pp.po_number IS NULL
)
UPDATE public.project_purchase_orders po
SET po_number = r.year || '-' || r.address_code || '-' || LPAD(r.seq::text, 4, '0')
FROM ranked_pos r
WHERE po.id = r.id;