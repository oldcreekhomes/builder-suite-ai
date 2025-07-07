-- Update the get_current_user_home_builder_id function to work with the new table structure
-- Employees are now in the employees table, not the users table

CREATE OR REPLACE FUNCTION public.get_current_user_home_builder_id()
RETURNS UUID AS $$
BEGIN
  -- Check if current user is an employee and return their home_builder_id from employees table
  RETURN (
    SELECT home_builder_id 
    FROM public.employees 
    WHERE id = auth.uid() 
    AND home_builder_id IS NOT NULL
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;