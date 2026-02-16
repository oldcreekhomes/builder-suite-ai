
-- Drop existing SELECT and UPDATE policies
DROP POLICY "Owners can view own onboarding progress" ON onboarding_progress;
DROP POLICY "Owners can update own onboarding progress" ON onboarding_progress;

-- Recreate SELECT policy: owner OR employee of that company
CREATE POLICY "Company members can view onboarding progress"
ON onboarding_progress FOR SELECT TO authenticated
USING (
  home_builder_id = auth.uid()
  OR home_builder_id IN (
    SELECT u.home_builder_id FROM users u WHERE u.id = auth.uid()
  )
);

-- Recreate UPDATE policy: owner OR employee of that company
CREATE POLICY "Company members can update onboarding progress"
ON onboarding_progress FOR UPDATE TO authenticated
USING (
  home_builder_id = auth.uid()
  OR home_builder_id IN (
    SELECT u.home_builder_id FROM users u WHERE u.id = auth.uid()
  )
);
