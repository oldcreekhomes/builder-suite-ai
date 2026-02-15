
-- Create onboarding_progress table
CREATE TABLE public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_builder_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email_verified boolean NOT NULL DEFAULT false,
  company_profile_completed boolean NOT NULL DEFAULT false,
  cost_codes_imported boolean NOT NULL DEFAULT false,
  chart_of_accounts_imported boolean NOT NULL DEFAULT false,
  companies_added boolean NOT NULL DEFAULT false,
  first_project_created boolean NOT NULL DEFAULT false,
  employees_invited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_progress_home_builder_id_key UNIQUE (home_builder_id)
);

-- Enable RLS
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Owner can read their own row
CREATE POLICY "Owners can view own onboarding progress"
  ON public.onboarding_progress
  FOR SELECT
  USING (home_builder_id = auth.uid());

-- Owner can insert their own row
CREATE POLICY "Owners can insert own onboarding progress"
  ON public.onboarding_progress
  FOR INSERT
  WITH CHECK (home_builder_id = auth.uid());

-- Owner can update their own row
CREATE POLICY "Owners can update own onboarding progress"
  ON public.onboarding_progress
  FOR UPDATE
  USING (home_builder_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_onboarding_progress_updated_at
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
