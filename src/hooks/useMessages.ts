import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  message_text?: string;
  file_urls?: string[];
  created_at: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
}

export const useMessages = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Fetch messages for conversation with other user
  const fetchMessages = async (otherUserId: string) => {
    try {
      setIsLoadingMessages(true);
      console.log('Fetching messages for conversation with user:', otherUserId);
      
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      const { data, error } = await supabase
        .from('user_chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUser.user.id})`)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      // Get sender info for each message
      const messagesWithSenders = await Promise.all(
        (data || []).map(async (msg) => {
          let senderName = 'Unknown';
          let senderAvatar = null;

          // Get sender info from unified users table
          const { data: sender } = await supabase
            .from('users')
            .select('first_name, last_name, avatar_url')
            .eq('id', msg.sender_id)
            .maybeSingle();

          if (sender) {
            senderName = `${sender.first_name || ''} ${sender.last_name || ''}`.trim();
            senderAvatar = sender.avatar_url;
          }

          return {
            ...msg,
            sender_name: senderName,
            sender_avatar: senderAvatar
          };
        })
      );

      console.log('Messages with senders:', messagesWithSenders);
      setMessages(messagesWithSenders);
      console.log('Messages state updated, length:', messagesWithSenders.length);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Add a single message to the list (for real-time updates)
  const addMessage = (newMessage: ChatMessage) => {
    setMessages(prevMessages => {
      // Check if message already exists to avoid duplicates
      const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
      if (messageExists) {
        console.log('Message already exists, skipping:', newMessage.id);
        return prevMessages;
      }
      
      console.log('Adding new message to chat:', newMessage);
      return [...prevMessages, newMessage];
    });
  };

  return {
    messages,
    isLoadingMessages,
    fetchMessages,
    setMessages,
    addMessage
  };
};