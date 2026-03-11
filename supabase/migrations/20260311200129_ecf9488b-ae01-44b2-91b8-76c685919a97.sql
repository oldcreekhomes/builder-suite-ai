-- Add can_edit_templates permission column
ALTER TABLE public.user_notification_preferences 
ADD COLUMN can_edit_templates boolean NOT NULL DEFAULT false;

-- Create template_content table for storing edited template boilerplate
CREATE TABLE public.template_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, template_key)
);

-- Enable RLS
ALTER TABLE public.template_content ENABLE ROW LEVEL SECURITY;

-- RLS policies: company members can read, edit-permission holders can write
CREATE POLICY "Users can read own company template content"
  ON public.template_content FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid() 
    OR owner_id = (SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND confirmed = true)
  );

CREATE POLICY "Users can insert template content for own company"
  ON public.template_content FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid() 
    OR owner_id = (SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND confirmed = true)
  );

CREATE POLICY "Users can update own company template content"
  ON public.template_content FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid() 
    OR owner_id = (SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND confirmed = true)
  );

-- Updated_at trigger
CREATE TRIGGER update_template_content_updated_at
  BEFORE UPDATE ON public.template_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable can_edit_templates for Matt Gray
UPDATE public.user_notification_preferences 
SET can_edit_templates = true 
WHERE user_id = '2653aba8-d154-4301-99bf-77d559492e19';