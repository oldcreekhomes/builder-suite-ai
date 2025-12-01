import { useCallback, useEffect, useRef } from 'react';
import { useCompanyUsers, User } from './useCompanyUsers';
import { useMessages, ChatMessage } from './useMessages';
import { useSendMessage } from './useSendMessage';
import { useChatRooms } from './useChatRooms';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Re-export interfaces for backwards compatibility
export type { User, ChatMessage };

export const useSimpleChat = () => {
  // Use focused hooks
  const { users, currentUserId, isLoading } = useCompanyUsers();
  const { messages, isLoadingMessages, fetchMessages, setMessages, addMessage, clearMessages } = useMessages();
  const { sendMessage: sendMessageHook } = useSendMessage();
  const { 
    selectedUser, 
    setSelectedUser, 
    startChatWithUser: startChatWithUserHook,
    markConversationAsRead 
  } = useChatRooms();

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Simple realtime subscription for active conversation messages
  useEffect(() => {
    if (!currentUserId || !selectedUser?.id) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase.channel(`chat-messages-${currentUserId}-${selectedUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_chat_messages',
          filter: `recipient_id=eq.${currentUserId}`,
        },
        (payload) => {
          const message = payload.new as any;
          // Only add if from the selected user
          if (message.sender_id === selectedUser.id) {
            console.log('💬 Chat: New message received via realtime');
            addMessage(message);
          }
        }
      )
      .subscribe((status, error) => {
        console.log('💬 Chat: Channel status:', status);
        if (error) {
          console.error('💬 Chat: Subscription error:', error);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentUserId, selectedUser?.id, addMessage]);

  // Enhanced start chat function that also fetches messages
  const startChatWithUser = useCallback(async (user: User) => {
    try {
      console.log('Starting chat with user:', user);
      
      // Always clear messages first to ensure clean state
      clearMessages();
      
      const userId = await startChatWithUserHook(user);
      if (userId) {
        // Always force refresh to ensure we get the latest messages
        await fetchMessages(userId, true);
      }
    } catch (error) {
      console.error('Error in startChatWithUser:', error);
    }
  }, [startChatWithUserHook, fetchMessages, clearMessages]);

  // Enhanced send message function
  const sendMessage = useCallback(async (messageText: string, files: File[] = []) => {
    await sendMessageHook(messageText, selectedUser, setMessages, files);
  }, [sendMessageHook, selectedUser, setMessages]);

  return {
    users,
    messages,
    selectedRoom: selectedUser, // For backwards compatibility
    currentUserId,
    isLoading,
    isLoadingMessages,
    setSelectedRoom: setSelectedUser, // For backwards compatibility
    startChatWithUser,
    startChatWithEmployee: startChatWithUser, // Alias for backwards compatibility
    sendMessage,
    fetchMessages,
    markRoomAsRead: markConversationAsRead // For backwards compatibility
  };
};
