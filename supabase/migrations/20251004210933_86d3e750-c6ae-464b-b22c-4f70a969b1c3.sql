-- Backfill project_id for journal entry lines that belong to project-scoped entries
-- This ensures historical journal entries made at the project level show all lines on the project Balance Sheet

UPDATE public.journal_entry_lines jel
SET project_id = (
  SELECT DISTINCT jel2.project_id
  FROM public.journal_entry_lines jel2
  WHERE jel2.journal_entry_id = jel.journal_entry_id
    AND jel2.project_id IS NOT NULL
  LIMIT 1
)
WHERE jel.project_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.journal_entry_lines jel3
    WHERE jel3.journal_entry_id = jel.journal_entry_id
      AND jel3.project_id IS NOT NULL
  );