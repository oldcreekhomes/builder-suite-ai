-- Add performance indexes for balance sheet queries
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_project_id ON public.journal_entry_lines(project_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_id ON public.journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_jel_project_account ON public.journal_entry_lines(project_id, account_id);