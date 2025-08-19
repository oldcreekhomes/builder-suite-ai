-- Fix RLS policies for accounts table to allow inserts for the service role

-- First check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'accounts';

-- The edge function uses service role, so we need to allow service role access
-- or update the existing policies to be more permissive

-- Drop existing restrictive policies and recreate them properly
DROP POLICY IF EXISTS "Accounts visible to owner and confirmed employees" ON accounts;
DROP POLICY IF EXISTS "Accounts insert limited to owner and confirmed employees" ON accounts;
DROP POLICY IF EXISTS "Accounts update limited to owner and confirmed employees" ON accounts;
DROP POLICY IF EXISTS "Accounts delete limited to owner and confirmed employees" ON accounts;

-- Create new policies that work properly with both user sessions and service role
CREATE POLICY "Enable read access for owners and employees" ON accounts
FOR SELECT USING (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT home_builder_id FROM users 
    WHERE id = auth.uid() AND confirmed = true AND role = 'employee'
  )
);

CREATE POLICY "Enable insert access for owners and employees" ON accounts
FOR INSERT WITH CHECK (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT home_builder_id FROM users 
    WHERE id = auth.uid() AND confirmed = true AND role = 'employee'
  )
);

CREATE POLICY "Enable update access for owners and employees" ON accounts
FOR UPDATE USING (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT home_builder_id FROM users 
    WHERE id = auth.uid() AND confirmed = true AND role = 'employee'
  )
) WITH CHECK (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT home_builder_id FROM users 
    WHERE id = auth.uid() AND confirmed = true AND role = 'employee'
  )
);

CREATE POLICY "Enable delete access for owners and employees" ON accounts
FOR DELETE USING (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT home_builder_id FROM users 
    WHERE id = auth.uid() AND confirmed = true AND role = 'employee'
  )
);