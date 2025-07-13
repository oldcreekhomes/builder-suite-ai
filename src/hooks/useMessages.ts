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

          // Try owners first
          const { data: owner } = await supabase
            .from('owners')
            .select('first_name, last_name, avatar_url')
            .eq('id', msg.sender_id)
            .maybeSingle();

          if (owner) {
            senderName = `${owner.first_name || ''} ${owner.last_name || ''}`.trim();
            senderAvatar = owner.avatar_url;
          } else {
            // Try employees
            const { data: employee } = await supabase
              .from('employees')
              .select('first_name, last_name, avatar_url')
              .eq('id', msg.sender_id)
              .maybeSingle();

            if (employee) {
              senderName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
              senderAvatar = employee.avatar_url;
            }
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

  return {
    messages,
    isLoadingMessages,
    fetchMessages,
    setMessages
  };
};