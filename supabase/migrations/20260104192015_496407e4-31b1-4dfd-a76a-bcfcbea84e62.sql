-- Add missing foreign key constraints for check_lines and deposit_lines
-- These are needed for PostgREST to resolve relationships in queries

-- Add foreign key from check_lines.cost_code_id to cost_codes.id
ALTER TABLE public.check_lines 
ADD CONSTRAINT check_lines_cost_code_id_fkey 
FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id);

-- Add foreign key from check_lines.account_id to accounts.id
ALTER TABLE public.check_lines 
ADD CONSTRAINT check_lines_account_id_fkey 
FOREIGN KEY (account_id) REFERENCES public.accounts(id);

-- Add foreign key from deposit_lines.account_id to accounts.id
ALTER TABLE public.deposit_lines 
ADD CONSTRAINT deposit_lines_account_id_fkey 
FOREIGN KEY (account_id) REFERENCES public.accounts(id);