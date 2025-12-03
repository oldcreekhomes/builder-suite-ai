-- Mark Jole Ann Sorensen's orphaned unread message as read to clear persistent badge
UPDATE user_chat_messages 
SET read_at = NOW() 
WHERE id = '27c46b00-3da9-4668-a1f6-ebf4639f08a3'
  AND recipient_id = '1a424219-39e8-46bd-817c-ac475047f564';