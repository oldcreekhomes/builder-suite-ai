-- Add sheet_number and sheet_title columns to takeoff_sheets table
ALTER TABLE public.takeoff_sheets 
ADD COLUMN IF NOT EXISTS sheet_number TEXT,
ADD COLUMN IF NOT EXISTS sheet_title TEXT;

-- Add index for faster lookups by sheet_number
CREATE INDEX IF NOT EXISTS idx_takeoff_sheets_sheet_number ON public.takeoff_sheets(sheet_number);

COMMENT ON COLUMN public.takeoff_sheets.sheet_number IS 'Architectural sheet designation from title block (e.g., A-1, S-2.1)';
COMMENT ON COLUMN public.takeoff_sheets.sheet_title IS 'Sheet title/name from title block (e.g., FRONT ELEVATION)';