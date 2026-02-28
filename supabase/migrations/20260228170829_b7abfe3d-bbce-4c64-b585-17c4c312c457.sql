
-- Add welcome_confirmed column to onboarding_progress
ALTER TABLE public.onboarding_progress
ADD COLUMN welcome_confirmed BOOLEAN NOT NULL DEFAULT FALSE;

-- Delete Erica Gray Homes' onboarding_progress row for fresh retesting
DELETE FROM public.onboarding_progress
WHERE home_builder_id = 'bfdbd789-0cd2-4b79-bc5f-51d28e2a3bc4';
