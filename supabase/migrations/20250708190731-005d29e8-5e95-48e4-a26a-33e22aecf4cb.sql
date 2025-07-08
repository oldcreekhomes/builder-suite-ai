-- Fix Jole Ann's employee record to use her correct auth ID
UPDATE employees 
SET id = '1a424219-39e8-46bd-817c-ac475047f564'::uuid
WHERE email = 'ap@oldcreekhomes.com' 
AND id = '274620ea-36ee-4ab8-898f-df41dff97740'::uuid;