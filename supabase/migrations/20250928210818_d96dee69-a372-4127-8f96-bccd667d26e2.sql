-- Create checks table to store check information
CREATE TABLE public.checks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  check_number text,
  check_date date NOT NULL DEFAULT (now())::date,
  pay_to text NOT NULL,
  bank_account_id uuid NOT NULL,
  project_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  memo text,
  company_name text,
  company_address text,
  company_city_state text,
  bank_name text,
  routing_number text,
  account_number text,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create check_lines table to store line item details
CREATE TABLE public.check_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_id uuid NOT NULL REFERENCES public.checks(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  line_number integer NOT NULL DEFAULT 1,
  line_type text NOT NULL CHECK (line_type IN ('job_cost', 'expense')),
  account_id uuid,
  cost_code_id uuid,
  project_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  memo text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_lines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for checks
CREATE POLICY "Checks visible to owner and confirmed employees" 
ON public.checks 
FOR SELECT 
USING ((owner_id = auth.uid()) OR (owner_id IN ( SELECT u.home_builder_id
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.confirmed = true) AND (u.role = 'employee'::text)))));

CREATE POLICY "Checks insert limited to owner and confirmed employees" 
ON public.checks 
FOR INSERT 
WITH CHECK ((owner_id = auth.uid()) OR (owner_id IN ( SELECT u.home_builder_id
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.confirmed = true) AND (u.role = 'employee'::text)))));

CREATE POLICY "Checks update limited to owner and confirmed employees" 
ON public.checks 
FOR UPDATE 
USING ((owner_id = auth.uid()) OR (owner_id IN ( SELECT u.home_builder_id
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.confirmed = true) AND (u.role = 'employee'::text)))));

CREATE POLICY "Checks delete limited to owner and confirmed employees" 
ON public.checks 
FOR DELETE 
USING ((owner_id = auth.uid()) OR (owner_id IN ( SELECT u.home_builder_id
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.confirmed = true) AND (u.role = 'employee'::text)))));

-- Create RLS policies for check_lines
CREATE POLICY "Check lines visible to owner and confirmed employees" 
ON public.check_lines 
FOR SELECT 
USING ((owner_id = auth.uid()) OR (owner_id IN ( SELECT u.home_builder_id
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.confirmed = true) AND (u.role = 'employee'::text)))));

CREATE POLICY "Check lines insert limited to owner and confirmed employees" 
ON public.check_lines 
FOR INSERT 
WITH CHECK ((owner_id = auth.uid()) OR (owner_id IN ( SELECT u.home_builder_id
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.confirmed = true) AND (u.role = 'employee'::text)))));

CREATE POLICY "Check lines update limited to owner and confirmed employees" 
ON public.check_lines 
FOR UPDATE 
USING ((owner_id = auth.uid()) OR (owner_id IN ( SELECT u.home_builder_id
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.confirmed = true) AND (u.role = 'employee'::text)))));

CREATE POLICY "Check lines delete limited to owner and confirmed employees" 
ON public.check_lines 
FOR DELETE 
USING ((owner_id = auth.uid()) OR (owner_id IN ( SELECT u.home_builder_id
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.confirmed = true) AND (u.role = 'employee'::text)))));

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_checks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_check_lines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_checks_updated_at
BEFORE UPDATE ON public.checks
FOR EACH ROW
EXECUTE FUNCTION public.update_checks_updated_at();

CREATE TRIGGER update_check_lines_updated_at
BEFORE UPDATE ON public.check_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_check_lines_updated_at();

-- Create trigger to sync check line owner with check owner
CREATE OR REPLACE FUNCTION public.sync_check_line_owner()
RETURNS TRIGGER AS $$
DECLARE
  c_owner uuid;
BEGIN
  SELECT owner_id INTO c_owner FROM public.checks WHERE id = NEW.check_id;
  IF c_owner IS NULL THEN
    RAISE EXCEPTION 'Invalid check_id';
  END IF;
  NEW.owner_id := c_owner;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sync_check_line_owner_trigger
BEFORE INSERT ON public.check_lines
FOR EACH ROW
EXECUTE FUNCTION public.sync_check_line_owner();