-- Allow owners to view their employees' notification preferences
CREATE POLICY "Owners can view their employees notification preferences"
ON user_notification_preferences
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = user_notification_preferences.user_id
    AND users.home_builder_id = auth.uid()
    AND has_role(auth.uid(), 'owner')
  )
);

-- Allow owners to insert notification preferences for their employees
CREATE POLICY "Owners can insert their employees notification preferences"
ON user_notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = user_notification_preferences.user_id
    AND users.home_builder_id = auth.uid()
    AND has_role(auth.uid(), 'owner')
  )
);

-- Allow owners to update their employees' notification preferences
CREATE POLICY "Owners can update their employees notification preferences"
ON user_notification_preferences
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = user_notification_preferences.user_id
    AND users.home_builder_id = auth.uid()
    AND has_role(auth.uid(), 'owner')
  )
);

-- Allow owners to delete their employees' notification preferences
CREATE POLICY "Owners can delete their employees notification preferences"
ON user_notification_preferences
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = user_notification_preferences.user_id
    AND users.home_builder_id = auth.uid()
    AND has_role(auth.uid(), 'owner')
  )
);