-- Add source column to track where marketplace companies came from
ALTER TABLE marketplace_companies 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add comment explaining the column
COMMENT ON COLUMN marketplace_companies.source IS 'Source of the company entry: manual (user signup) or google_places (auto-populated)';

-- Create index for filtering by source
CREATE INDEX IF NOT EXISTS idx_marketplace_companies_source ON marketplace_companies(source);