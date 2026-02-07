-- ================================================================
-- Two-Path Signup: Database Migration
-- ================================================================

-- 1. Add user_id to marketplace_companies table (allows vendors to own their listing)
ALTER TABLE public.marketplace_companies 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Add marketplace_company_id to companies table (soft link for home builders)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS marketplace_company_id uuid REFERENCES public.marketplace_companies(id) ON DELETE SET NULL;

-- 3. Add user_type column to users table to distinguish login types
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'home_builder' 
CHECK (user_type IN ('home_builder', 'marketplace_vendor'));

-- 4. Create RLS policy for marketplace company owners to update their own listing
DROP POLICY IF EXISTS "Marketplace company owners can update their own listing" ON public.marketplace_companies;
CREATE POLICY "Marketplace company owners can update their own listing"
ON public.marketplace_companies
FOR UPDATE
USING (auth.uid() = user_id);

-- 5. Create RLS policy for authenticated users to insert marketplace companies (signup)
DROP POLICY IF EXISTS "Authenticated users can create marketplace companies" ON public.marketplace_companies;
CREATE POLICY "Authenticated users can create marketplace companies"
ON public.marketplace_companies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 6. Create RLS policy for marketplace company owners to view their own listing
DROP POLICY IF EXISTS "Marketplace company owners can view their own listing" ON public.marketplace_companies;
CREATE POLICY "Marketplace company owners can view their own listing"
ON public.marketplace_companies
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- 7. Update handle_new_user trigger to handle marketplace_vendor user type
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_type_val text;
  owner_company_name text;
BEGIN
  user_type_val := COALESCE(NEW.raw_user_meta_data->>'user_type', 'home_builder');
  
  -- If employee, get the company name from their owner
  IF user_type_val = 'employee' AND NEW.raw_user_meta_data->>'home_builder_id' IS NOT NULL THEN
    SELECT company_name INTO owner_company_name
    FROM public.users 
    WHERE id = (NEW.raw_user_meta_data->>'home_builder_id')::uuid 
      AND role = 'owner';
  END IF;
  
  -- Insert user into the users table
  INSERT INTO public.users (
    id, email, first_name, last_name, phone_number, company_name, 
    role, home_builder_id, confirmed, user_type
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone_number',
    CASE 
      WHEN user_type_val = 'home_builder' THEN NEW.raw_user_meta_data->>'company_name'
      WHEN user_type_val = 'employee' THEN owner_company_name
      WHEN user_type_val = 'marketplace_vendor' THEN NEW.raw_user_meta_data->>'company_name'
      ELSE NULL 
    END,
    CASE 
      WHEN user_type_val = 'home_builder' THEN 'owner' 
      WHEN user_type_val = 'marketplace_vendor' THEN 'owner'
      ELSE 'employee' 
    END,
    CASE WHEN user_type_val = 'employee' THEN (NEW.raw_user_meta_data->>'home_builder_id')::uuid ELSE NULL END,
    CASE WHEN user_type_val IN ('home_builder', 'marketplace_vendor') THEN TRUE ELSE FALSE END,
    user_type_val
  );
  
  RETURN NEW;
END;
$function$;