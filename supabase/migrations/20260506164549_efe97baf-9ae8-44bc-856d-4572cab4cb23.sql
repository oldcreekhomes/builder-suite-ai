UPDATE public.onboarding_progress
   SET welcome_confirmed = true
 WHERE welcome_confirmed = false
   AND (dismissed = true OR company_profile_completed = true);