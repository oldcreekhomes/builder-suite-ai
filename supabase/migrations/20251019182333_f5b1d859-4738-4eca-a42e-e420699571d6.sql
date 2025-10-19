-- Add color column to takeoff_items
ALTER TABLE takeoff_items 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_takeoff_items_color ON takeoff_items(color);

-- Create takeoff_annotations table
CREATE TABLE IF NOT EXISTS takeoff_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  takeoff_item_id UUID NOT NULL REFERENCES takeoff_items(id) ON DELETE CASCADE,
  takeoff_sheet_id UUID NOT NULL REFERENCES takeoff_sheets(id) ON DELETE CASCADE,
  shape_type TEXT NOT NULL CHECK (shape_type IN ('circle', 'rectangle', 'line', 'polygon')),
  shape_data JSONB NOT NULL,
  color TEXT NOT NULL,
  position JSONB,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_takeoff_annotations_item ON takeoff_annotations(takeoff_item_id);
CREATE INDEX IF NOT EXISTS idx_takeoff_annotations_sheet ON takeoff_annotations(takeoff_sheet_id);

-- RLS Policies
ALTER TABLE takeoff_annotations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Annotations visible to company users" ON takeoff_annotations;
DROP POLICY IF EXISTS "Annotations insertable by company users" ON takeoff_annotations;
DROP POLICY IF EXISTS "Annotations updatable by company users" ON takeoff_annotations;
DROP POLICY IF EXISTS "Annotations deletable by company users" ON takeoff_annotations;

-- Allow company users to view annotations
CREATE POLICY "Annotations visible to company users"
  ON takeoff_annotations FOR SELECT
  USING (get_current_user_company() IS NOT NULL);

-- Allow company users to insert annotations
CREATE POLICY "Annotations insertable by company users"
  ON takeoff_annotations FOR INSERT
  WITH CHECK (get_current_user_company() IS NOT NULL);

-- Allow company users to update annotations
CREATE POLICY "Annotations updatable by company users"
  ON takeoff_annotations FOR UPDATE
  USING (get_current_user_company() IS NOT NULL);

-- Allow company users to delete annotations
CREATE POLICY "Annotations deletable by company users"
  ON takeoff_annotations FOR DELETE
  USING (get_current_user_company() IS NOT NULL);

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_takeoff_annotations_updated_at ON takeoff_annotations;

-- Trigger for updated_at
CREATE TRIGGER update_takeoff_annotations_updated_at
  BEFORE UPDATE ON takeoff_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_takeoff_annotations_updated_at();