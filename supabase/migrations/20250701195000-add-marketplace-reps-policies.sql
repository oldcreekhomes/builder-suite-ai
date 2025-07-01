
-- Add INSERT, UPDATE, and DELETE policies for marketplace_company_representatives table
CREATE POLICY "Authenticated users can insert marketplace representatives" 
  ON public.marketplace_company_representatives 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update marketplace representatives" 
  ON public.marketplace_company_representatives 
  FOR UPDATE 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete marketplace representatives" 
  ON public.marketplace_company_representatives 
  FOR DELETE 
  TO authenticated
  USING (true);
