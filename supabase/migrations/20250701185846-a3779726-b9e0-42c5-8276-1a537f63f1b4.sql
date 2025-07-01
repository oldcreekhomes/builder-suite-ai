
-- Add INSERT policy for marketplace_companies table
CREATE POLICY "Authenticated users can insert marketplace companies" 
  ON public.marketplace_companies 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Add UPDATE policy for marketplace_companies table
CREATE POLICY "Authenticated users can update marketplace companies" 
  ON public.marketplace_companies 
  FOR UPDATE 
  TO authenticated
  USING (true);

-- Add DELETE policy for marketplace_companies table  
CREATE POLICY "Authenticated users can delete marketplace companies" 
  ON public.marketplace_companies 
  FOR DELETE 
  TO authenticated
  USING (true);
