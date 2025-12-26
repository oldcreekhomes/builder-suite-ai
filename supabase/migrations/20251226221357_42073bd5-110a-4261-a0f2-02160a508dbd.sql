-- One-time fix: Set all completed projects to QuickBooks accounting software
UPDATE projects 
SET accounting_software = 'quickbooks', 
    updated_at = NOW()
WHERE status = 'Completed' 
  AND (accounting_software IS NULL OR accounting_software = '');