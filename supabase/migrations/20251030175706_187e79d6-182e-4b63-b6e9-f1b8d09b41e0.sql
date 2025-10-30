-- Fix RLS policies for project_purchase_orders to allow all confirmed company users
-- No role checking - just company scoping via home_builder_id

-- 1. Drop old policies that incorrectly check users.role
DROP POLICY IF EXISTS "Users can view purchase orders for their projects" ON public.project_purchase_orders;
DROP POLICY IF EXISTS "Users can create purchase orders for their projects" ON public.project_purchase_orders;
DROP POLICY IF EXISTS "Users can update purchase orders for their projects" ON public.project_purchase_orders;
DROP POLICY IF EXISTS "Users can delete purchase orders for their projects" ON public.project_purchase_orders;

-- 2. Create new SELECT policy - all company users can view
CREATE POLICY "POs visible to company users"
ON public.project_purchase_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM projects
    WHERE projects.id = project_purchase_orders.project_id
      AND (
        projects.owner_id = auth.uid()
        OR projects.owner_id IN (
          SELECT u.home_builder_id
          FROM users u
          WHERE u.id = auth.uid()
            AND u.confirmed = true
        )
      )
  )
);

-- 3. Create new INSERT policy - all company users can create
CREATE POLICY "POs insert limited to company users"
ON public.project_purchase_orders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM projects
    WHERE projects.id = project_purchase_orders.project_id
      AND (
        projects.owner_id = auth.uid()
        OR projects.owner_id IN (
          SELECT u.home_builder_id
          FROM users u
          WHERE u.id = auth.uid()
            AND u.confirmed = true
        )
      )
  )
);

-- 4. Create new UPDATE policy - all company users can update
CREATE POLICY "POs update limited to company users"
ON public.project_purchase_orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM projects
    WHERE projects.id = project_purchase_orders.project_id
      AND (
        projects.owner_id = auth.uid()
        OR projects.owner_id IN (
          SELECT u.home_builder_id
          FROM users u
          WHERE u.id = auth.uid()
            AND u.confirmed = true
        )
      )
  )
);

-- 5. Create new DELETE policy - all company users can delete
CREATE POLICY "POs delete limited to company users"
ON public.project_purchase_orders
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM projects
    WHERE projects.id = project_purchase_orders.project_id
      AND (
        projects.owner_id = auth.uid()
        OR projects.owner_id IN (
          SELECT u.home_builder_id
          FROM users u
          WHERE u.id = auth.uid()
            AND u.confirmed = true
        )
      )
  )
);