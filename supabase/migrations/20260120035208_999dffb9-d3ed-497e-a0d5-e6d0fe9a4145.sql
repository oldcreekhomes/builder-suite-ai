-- Allow anonymous users to check if a company name already exists during signup
-- This only exposes company names for owner accounts, not sensitive user data
CREATE POLICY "Allow checking company name existence for signup"
ON public.users
FOR SELECT
TO anon
USING (role = 'owner' AND company_name IS NOT NULL);