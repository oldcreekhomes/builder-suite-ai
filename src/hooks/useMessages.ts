import { useState, useCallback } from 'react';
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
  const [currentConversationUserId, setCurrentConversationUserId] = useState<string | null>(null);

  // Clear messages when switching conversations
  const clearMessages = useCallback(() => {
    console.log('Clearing messages for conversation switch');
    setMessages([]);
  }, []);

  // Fetch messages for conversation with other user
  const fetchMessages = useCallback(async (otherUserId: string, forceRefresh = false) => {
    try {
      setIsLoadingMessages(true);
      
      // Clear messages if switching to different conversation or force refresh
      if (currentConversationUserId !== otherUserId || forceRefresh) {
        console.log('Clearing messages - switching from', currentConversationUserId, 'to', otherUserId);
        setMessages([]);
        setCurrentConversationUserId(otherUserId);
      }
      
      console.log('Fetching messages for conversation with user:', otherUserId, 'forceRefresh:', forceRefresh);
      
      // Get current user with retry logic
      const { data: currentUser, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }
      
      if (!currentUser.user) {
        console.error('No authenticated user found');
        return;
      }

      console.log('Current user ID:', currentUser.user.id, 'Other user ID:', otherUserId);

      // Simplified query approach - fetch messages in both directions separately then combine
      const { data: sentMessages, error: sentError } = await supabase
        .from('user_chat_messages')
        .select('*')
        .eq('sender_id', currentUser.user.id)
        .eq('recipient_id', otherUserId)
        .eq('is_deleted', false);

      const { data: receivedMessages, error: receivedError } = await supabase
        .from('user_chat_messages')
        .select('*')
        .eq('sender_id', otherUserId)
        .eq('recipient_id', currentUser.user.id)
        .eq('is_deleted', false);

      if (sentError) {
        console.error('Error fetching sent messages:', sentError);
        throw sentError;
      }
      
      if (receivedError) {
        console.error('Error fetching received messages:', receivedError);
        throw receivedError;
      }

      // Combine and sort messages
      const allMessages = [...(sentMessages || []), ...(receivedMessages || [])]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(-50); // Keep only the last 50 messages

      console.log('Raw messages fetched:', {
        sent: sentMessages?.length || 0,
        received: receivedMessages?.length || 0,
        total: allMessages.length,
        messages: allMessages.map(m => ({ id: m.id, text: m.message_text?.substring(0, 30), sender: m.sender_id, created: m.created_at }))
      });

      // Get sender info for each message
      const messagesWithSenders = await Promise.all(
        allMessages.map(async (msg) => {
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
      console.log('Full message objects:', messagesWithSenders.map(m => ({ id: m.id, text: m.message_text, sender: m.sender_name, created_at: m.created_at })));
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [currentConversationUserId]);

  // Add a single message to the list (for real-time updates)
  const addMessage = useCallback((newMessage: ChatMessage) => {
    setMessages(prevMessages => {
      // Check if message already exists by ID
      const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
      if (messageExists) {
        console.log('Message already exists, skipping:', newMessage.id);
        return prevMessages;
      }
      
      // Check for optimistic message to replace (for real-time updates)
      // Look for a temporary message from the same sender with similar content and timing
      if (!newMessage.id.startsWith('temp-')) {
        const optimisticMessageIndex = prevMessages.findIndex(msg => {
          if (!msg.id.startsWith('temp-') || msg.sender_id !== newMessage.sender_id) {
            return false;
          }
          
          // Check timing (within 10 seconds)
          const timeDiff = Math.abs(new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime());
          if (timeDiff >= 10000) {
            return false;
          }
          
          // Compare message text (normalize null and empty string)
          const normalizeText = (text?: string | null) => text?.trim() || null;
          const textMatches = normalizeText(msg.message_text) === normalizeText(newMessage.message_text);
          
          // Compare file URLs (both must be arrays or both null/undefined)
          const msgFiles = msg.file_urls || [];
          const newMsgFiles = newMessage.file_urls || [];
          const filesMatch = msgFiles.length === newMsgFiles.length && 
            msgFiles.every((file, index) => file === newMsgFiles[index]);
          
          return textMatches && filesMatch;
        });
        
        if (optimisticMessageIndex !== -1) {
          console.log('Replacing optimistic message with real message:', {
            optimistic: prevMessages[optimisticMessageIndex].id,
            real: newMessage.id
          });
          
          // Replace the optimistic message with the real one
          const updatedMessages = [...prevMessages];
          updatedMessages[optimisticMessageIndex] = newMessage;
          return updatedMessages;
        }
      }
      
      console.log('Adding new message to chat:', newMessage);
      return [...prevMessages, newMessage];
    });
  }, []);

  return {
    messages,
    isLoadingMessages,
    fetchMessages,
    setMessages,
    addMessage,
    clearMessages,
    currentConversationUserId
  };
};