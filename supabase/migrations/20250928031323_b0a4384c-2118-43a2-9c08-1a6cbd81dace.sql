-- Create basic default accounts for chart of accounts
-- This will provide the minimum accounts needed for bill approval to work

-- Insert basic liability account for Accounts Payable
INSERT INTO public.accounts (code, name, type, description, owner_id, is_active)
SELECT '2010', 'Accounts Payable', 'liability', 'Outstanding amounts owed to vendors and suppliers', u.id, true
FROM public.users u 
WHERE u.role = 'owner' 
AND NOT EXISTS (
  SELECT 1 FROM public.accounts a 
  WHERE a.owner_id = u.id AND a.type = 'liability' AND a.name = 'Accounts Payable'
);

-- Insert basic asset account for Work in Progress
INSERT INTO public.accounts (code, name, type, description, owner_id, is_active)
SELECT '1410', 'WIP - Direct Construction Costs', 'asset', 'Work in progress costs for active construction projects', u.id, true
FROM public.users u 
WHERE u.role = 'owner'
AND NOT EXISTS (
  SELECT 1 FROM public.accounts a 
  WHERE a.owner_id = u.id AND a.type = 'asset' AND a.name = 'WIP - Direct Construction Costs'
);

-- Insert basic expense accounts
INSERT INTO public.accounts (code, name, type, description, owner_id, is_active)
SELECT '5000', 'Office Expenses', 'expense', 'General office and administrative expenses', u.id, true
FROM public.users u 
WHERE u.role = 'owner'
AND NOT EXISTS (
  SELECT 1 FROM public.accounts a 
  WHERE a.owner_id = u.id AND a.code = '5000'
);

INSERT INTO public.accounts (code, name, type, description, owner_id, is_active)
SELECT '5100', 'Professional Services', 'expense', 'Legal, accounting, and consulting fees', u.id, true
FROM public.users u 
WHERE u.role = 'owner'
AND NOT EXISTS (
  SELECT 1 FROM public.accounts a 
  WHERE a.owner_id = u.id AND a.code = '5100'
);

-- Create accounting settings with the default accounts
INSERT INTO public.accounting_settings (owner_id, ap_account_id, wip_account_id)
SELECT 
  u.id,
  ap_account.id,
  wip_account.id
FROM public.users u
LEFT JOIN public.accounts ap_account ON (ap_account.owner_id = u.id AND ap_account.type = 'liability' AND ap_account.name = 'Accounts Payable')
LEFT JOIN public.accounts wip_account ON (wip_account.owner_id = u.id AND wip_account.type = 'asset' AND wip_account.name = 'WIP - Direct Construction Costs')
WHERE u.role = 'owner'
AND ap_account.id IS NOT NULL 
AND wip_account.id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.accounting_settings s WHERE s.owner_id = u.id
);