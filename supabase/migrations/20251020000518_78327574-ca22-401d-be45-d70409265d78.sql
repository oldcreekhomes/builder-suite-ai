-- Add columns to store AI processing image dimensions
ALTER TABLE public.takeoff_sheets
ADD COLUMN ai_processing_width integer,
ADD COLUMN ai_processing_height integer;

COMMENT ON COLUMN public.takeoff_sheets.ai_processing_width IS 'Width of image used by Roboflow AI for coordinate system';
COMMENT ON COLUMN public.takeoff_sheets.ai_processing_height IS 'Height of image used by Roboflow AI for coordinate system';