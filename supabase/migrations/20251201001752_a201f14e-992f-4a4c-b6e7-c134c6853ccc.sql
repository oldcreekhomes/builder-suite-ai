-- Create a security definer function to check if two users are in the same company
CREATE OR REPLACE FUNCTION public.users_in_same_company(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM users u1
    JOIN users u2 ON (
      -- Both are employees of the same home builder
      (u1.home_builder_id = u2.home_builder_id AND u1.home_builder_id IS NOT NULL)
      -- Or one is the owner and the other is their employee
      OR u1.id = u2.home_builder_id
      OR u1.home_builder_id = u2.id
      -- Or both are the same user (edge case for self)
      OR u1.id = u2.id
    )
    WHERE u1.id = user1_id AND u2.id = user2_id
  );
$$;

-- Drop the existing INSERT policy that doesn't check company
DROP POLICY IF EXISTS "Users can send messages" ON user_chat_messages;

-- Create new INSERT policy that enforces same-company messaging
CREATE POLICY "Users can send messages to company members" 
ON user_chat_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid() 
  AND users_in_same_company(auth.uid(), recipient_id)
);

-- Add DELETE policy so users can delete their own messages
CREATE POLICY "Users can delete their own messages" 
ON user_chat_messages
FOR DELETE
USING (sender_id = auth.uid());