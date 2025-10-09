-- 1. Create role enum (owner, accountant, employee)
CREATE TYPE public.app_role AS ENUM ('owner', 'accountant', 'employee');

-- 2. Create user_roles table (separate from users table for security)
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- 3. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. RLS policy: users can view their own roles only
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

-- 5. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 6. Migrate existing owners to user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'owner'::app_role
FROM public.users
WHERE role = 'owner'
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. Drop existing delete policy for bills
DROP POLICY IF EXISTS "Bills delete limited to owner and confirmed employees" ON public.bills;

-- 8. Create new restrictive policy: ONLY owner or accountant can delete
CREATE POLICY "Only owners and accountants can delete bills"
ON public.bills FOR DELETE
USING (
  -- Must be the owner of the bill AND have owner role
  (owner_id = auth.uid() AND public.has_role(auth.uid(), 'owner'))
  OR 
  -- OR be an accountant working for the bill's owner
  (owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() 
      AND confirmed = true
      AND public.has_role(auth.uid(), 'accountant')
  ))
);