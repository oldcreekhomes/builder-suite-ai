-- Fix Erica Gray's ID mismatch between auth.users and employees table
-- Her auth.users ID is 071212e3-288b-4e12-9b84-0c1e3a950d34
-- But her employees table ID is 7689683c-0ba8-4dbf-b0c6-1c4cb7abe7e6

UPDATE public.employees 
SET id = '071212e3-288b-4e12-9b84-0c1e3a950d34'
WHERE email = 'egray@oldcreekhomes.com';